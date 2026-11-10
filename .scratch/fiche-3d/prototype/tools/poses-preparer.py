# Outil de cuisson (jamais publié) : prépare les photos de pose (src/poses.js) à partir des photos
# d'origine et des masques de poses-detourer.py. Pour chaque taille, dans le dossier de sortie :
# - pose-<taille>.jpg : la photo à 3168 px de large (6 px par cm de mur), le rectangle blanc effacé
#   (le mur refait : sa lumière prolongée depuis autour, un grain de la force de celui du mur) ;
# - pose-<taille>-femme.webp : ce qui passe devant le tableau, la femme (détourage BiRefNet) et, sur
#   les photos meublées, les feuilles, branches et objets (clé de couleur sur le mur blanc), avec
#   leurs couleurs estimées sans le mur (pymatting, licence MIT), là seulement où le tableau et son
#   ombre peuvent passer ;
# - pose-<taille>-lumiere.png : la lumière du mur sans la femme ni les meubles, en cases d'environ
#   3 cm ;
# - poses.json : les mesures recopiées dans src/poses.js (femme, tête, calque, bandes sans rien devant
#   le mur le long des bords gauche et droit, bras lointain).
#
#   venv\Scripts\python -I poses-preparer.py <dossier des photos> <dossier des masques> <dossier de sortie> [tailles...]
import json, os, sys
import numpy as np
from PIL import Image
from scipy import ndimage, sparse
from scipy.sparse.linalg import spsolve
from pymatting import estimate_foreground_ml

PHOTOS, MASKS, out_dir = sys.argv[1], sys.argv[2], sys.argv[3]
os.makedirs(out_dir, exist_ok=True)

# Photos larges de la version 24 (6336 × 2688, 21:9) : la pièce recomposée par Gemini, olivier et
# lampadaire entiers, mur, plinthe et parquet nus jusqu'aux bords.
SCALE = 0.5  # 6336 -> 3168 px : 6 px par cm de mur, assez pour l'écran
PX_PER_CM = 12  # photos d'origine, dans le plan du mur (hauteur des rectangles : 11,96 à 12,1)
HEAD_CM = 24  # hauteur de la tête, cheveux compris, depuis le haut de la femme
PLINTH = 2310  # haut de la plinthe (photo d'origine) : la clé de couleur ne joue qu'au-dessus, sur le mur
EDGE = round(1.5 * PX_PER_CM)  # garde au-dessus de la plinthe (photo d'origine)
# Rectangles blancs (photo d'origine) : left, top, width, height, relevés sur chaque photo (Gemini
# les a tracés un peu larges en 30 × 40 et un peu étroits en 75 × 100 : le tableau s'accroche à leur
# coin bas droit, là où ses mains le présentent).
RECTS = {
    '30x40': (2676, 376, 378, 484),
    '60x80': (2362, 141, 717, 957),
    '75x100': (2267, 21, 878, 1198),
    '90x120': (2175, 20, 1075, 1441),
}
sizes = sys.argv[4:] or list(RECTS)
# Traits laissés sur le mur par la génération, près du rectangle (photo d'origine) : à refaire aussi
# (les photos de la version 21 avaient un trait de crayon sous le rectangle ; plus depuis).
MARKS = {}
# Parties des meubles que la clé de couleur ne voit pas (blanches ou beiges comme le mur) : une
# boîte qui les couvre sur les quatre photos, où ils ont un peu bougé (photo d'origine : left, top,
# right, bottom).
FURNITURE = [
    (1290, 2060, 1820, 2650),  # pot de l'olivier
    (4560, 590, 5320, 1020),  # abat-jour
    (1820, 1920, 3480, 2115),  # plateau du banc
    (2040, 1440, 2560, 2060),  # vase, livres et bol
]
# Balance des blancs : le mur de chaque photo ramené au même blanc chaud (rapports rouge, vert, bleu),
# à luminosité égale. Il est mesuré sur deux bandes de mur nu (photo d'origine : x0, x1, y0, y1).
WARM_WHITE = (1.0, 0.975, 0.935)
WALL_SAMPLES = [(200, 900, 300, 1800), (5600, 6200, 300, 1800)]  # mur nu, à gauche de l'olivier et à droite du lampadaire


def balance(img):
    """Gains par canal qui ramènent le mur à WARM_WHITE, à luminosité égale."""
    parts = [img[int(y0 * SCALE):int(y1 * SCALE), int(x0 * SCALE):int(x1 * SCALE)].reshape(-1, 3) for x0, x1, y0, y1 in WALL_SAMPLES]
    wall = np.concatenate(parts).mean(axis=0)
    weights = np.array([0.2126, 0.7152, 0.0722])
    target = np.array(WARM_WHITE) * (wall @ weights) / (np.array(WARM_WHITE) @ weights)
    return target / wall


# Zone où le tableau d'une taille et son ombre peuvent passer, cadre compris (photo d'origine).
# Depuis la version 23, le tableau paraît SCALE_UP fois plus grand qu'elle ne le voyait
# (POSES.scale) : accroché par son coin bas côté femme, il couvre le rectangle agrandi d'autant vers
# le haut et la gauche ; plus 5 cm de cadre autour et 3 cm d'ombre en bas (elle tombe à gauche et en
# bas). Le calque de ce qui passe devant le tableau n'est utile que là.
SCALE_UP = 1.2
FRAME_CM, SHADOW_CM = 5, 3


def painted(rect):
    L, T, W, H = rect
    k = SCALE_UP * PX_PER_CM  # px de la photo par cm du tableau
    f, s = FRAME_CM * k, SHADOW_CM * k
    return (L + W - SCALE_UP * W - f, T + H - SCALE_UP * H - f, L + W + f, T + H + f + s)


def harmonic(boundary_values, region):
    """Valeurs harmoniques dans `region` (bool), égales à `boundary_values` autour (Laplace, 5 points)."""
    h, w = region.shape
    idx = -np.ones((h, w), dtype=np.int64)
    ys, xs = np.nonzero(region)
    idx[ys, xs] = np.arange(len(ys))
    n = len(ys)
    rows, cols, vals = [], [], []
    rhs = np.zeros((n, boundary_values.shape[2]))
    for k, (y, x) in enumerate(zip(ys, xs)):
        rows.append(k); cols.append(k); vals.append(4.0)
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            yy, xx = min(max(y + dy, 0), h - 1), min(max(x + dx, 0), w - 1)
            j = idx[yy, xx]
            if j >= 0:
                rows.append(k); cols.append(j); vals.append(-1.0)
            else:
                rhs[k] += boundary_values[yy, xx]
    A = sparse.csr_matrix((vals, (rows, cols)), shape=(n, n))
    sol = spsolve(A.tocsc(), rhs)
    outv = np.zeros_like(boundary_values)
    outv[ys, xs] = sol.reshape(n, -1)
    return outv


def smoothstep(a, b, x):
    t = np.clip((x - a) / (b - a), 0, 1)
    return t * t * (3 - 2 * t)


def wall_light(img, wall, by=28, bx=25):
    """Lumière du mur (couleur) partout : moyenne des pixels de mur par cases d'environ 3 cm, cases
    sans mur prolongées depuis autour (harmonique), agrandie en bilinéaire."""
    h, w = wall.shape
    gh, gw = h // by, w // bx
    wv = wall[:gh * by, :gw * bx].astype(np.float64)
    total = (img[:gh * by, :gw * bx] * wv[..., None]).reshape(gh, by, gw, bx, 3).sum(axis=(1, 3))
    count = wv.reshape(gh, by, gw, bx).sum(axis=(1, 3))
    seen = count > 0.3 * by * bx
    low = total / np.maximum(count, 1e-6)[..., None]
    filled = harmonic(np.where(seen[..., None], low, 0), ~seen)
    low[~seen] = filled[~seen]
    yy = np.clip((np.arange(h) + 0.5) / by - 0.5, 0, gh - 1)
    xx = np.clip((np.arange(w) + 0.5) / bx - 0.5, 0, gw - 1)
    gy, gx = np.meshgrid(yy, xx, indexing='ij')
    return np.dstack([ndimage.map_coordinates(low[..., c], [gy, gx], order=1) for c in range(3)])


def object_key(img, alpha, ignore=None):
    """Détourage de ce qui est devant le mur blanc, au-dessus de la plinthe (feuilles, branches,
    objets) : la part dont chaque pixel est plus sombre ou d'une autre teinte que la lumière du mur à
    cet endroit. Pixel par pixel, sans combler les jours entre les feuilles : le mur y reste. L'ombre
    douce de la femme suit la lumière du mur et reste du mur. ignore : une zone qui n'est pas un objet
    (le rectangle blanc, refait ensuite)."""
    h, w = alpha.shape
    above = np.zeros((h, w), dtype=bool)
    above[:int((PLINTH - EDGE) * SCALE)] = True  # au-dessus du bord de la plinthe
    if ignore is not None:
        above &= ~ignore
    weights = np.array([0.2126, 0.7152, 0.0722])
    lum = img @ weights
    tint = img / np.maximum(lum[..., None], 1)
    # Le mur, en deux passes : d'abord tout ce qui n'est ni elle ni nettement plus sombre que la
    # lumière moyenne du lieu, puis sans ce que la première passe a vu.
    rough = np.maximum(ndimage.gaussian_filter(lum, 40), 1)
    wall = (alpha < 0.02) & above & (lum > 0.85 * rough)
    for _ in range(2):
        light = wall_light(img, wall)
        light_lum = np.maximum(light @ weights, 1)
        darker = (light_lum - lum) / light_lum
        chroma = np.abs(tint - light / light_lum[..., None]).max(axis=2)
        key = np.maximum(smoothstep(0.04, 0.32, darker), smoothstep(0.05, 0.16, chroma))
        wall = (alpha < 0.02) & above & (key < 0.05)
    key = ndimage.grey_opening(key, size=2)  # sans les points isolés du plâtre
    key[~above] = 0
    return np.clip(key, 0, 1)


def far_arm(mask, person, head):
    """Son bras lointain (à droite de l'image, côté lampadaire), s'il s'écarte d'elle de plus de 15 cm :
    le bord de son corps, son coude et son poignet (x, photo d'origine), ou None. Profil des colonnes
    du masque, entre le bas de sa tête et sa taille : le corps y est épais, le bras fin ; le poignet
    est le plus fin avant que la main ne s'élargisse, le coude le plus loin de la droite qui joint le
    bord du corps au poignet."""
    band = mask[head[3]:person[1] + int(0.42 * (person[3] - person[1]))] > 128
    thick = band.sum(axis=0).astype(np.float64)
    cx = (head[0] + head[2]) // 2
    torso = float(np.median(thick[cx - 5 * PX_PER_CM:cx + 5 * PX_PER_CM]))
    body = cx
    while body < person[2] and thick[body] > 0.4 * torso:
        body += 1
    if person[2] - body < 15 * PX_PER_CM:
        return None
    arm = ndimage.uniform_filter1d(thick[body:person[2]], PX_PER_CM)  # lissé sur 1 cm
    wrist = None
    for i in range(1, len(arm) - 1):
        ahead = arm[i:i + 4 * PX_PER_CM]
        if arm[i] <= arm[i - 1] and arm[i] <= arm[i + 1] and ahead.max() > 1.2 * arm[i]:
            wrist = i  # le premier creux suivi de la main, plus large d'un cinquième
            break
    if wrist is None:
        return None
    rows = np.arange(band.shape[0])[:, None]
    centre = (band * rows).sum(axis=0) / np.maximum(band.sum(axis=0), 1)
    xs = np.arange(body, body + wrist + 1)
    a = np.array([body, centre[body]])
    b = np.array([body + wrist, centre[body + wrist]])
    d = b - a
    gap = np.abs(d[0] * (centre[xs] - a[1]) - d[1] * (xs - a[0])) / max(float(np.hypot(*d)), 1e-6)
    elbow = int(xs[int(np.argmax(gap))])
    return {'body': int(body), 'elbow': elbow, 'wrist': int(body + wrist)}


def furniture(objects, alpha):
    """Les meubles et objets posés (olivier et son pot, banc, vase, lampadaire, panier) : la boîte de
    chaque grande tache de la clé, hors de la femme. Leurs parties blanches (pot, abat-jour, plateau
    du banc), que la clé ne voit pas, y sont. Une tache qui descend jusqu'à la plinthe tient sur le
    sol : sa boîte va jusqu'en bas de la photo."""
    h, w = objects.shape
    her = ndimage.binary_dilation(alpha > 0.02, iterations=6)
    spots = ndimage.binary_dilation((objects > 0.3) & ~her, iterations=4)
    labels, count = ndimage.label(spots)
    mask = np.zeros((h, w), dtype=bool)
    floor_line = int((PLINTH - 2 * EDGE) * SCALE)
    for i, sl in enumerate(ndimage.find_objects(labels)):
        if sl is None or (labels[sl] == i + 1).sum() < (2 * PX_PER_CM * SCALE) ** 2:  # moins de 2 cm de côté : du plâtre
            continue
        mask[sl[0].start:(h if sl[0].stop >= floor_line else sl[0].stop), sl[1]] = True
    return ndimage.binary_dilation(mask | furniture_boxes(h, w), iterations=6)


def furniture_boxes(h, w):
    """Les boîtes FURNITURE, à demi-échelle."""
    mask = np.zeros((h, w), dtype=bool)
    for box in FURNITURE:
        l, t, r, b = [int(round(v * SCALE)) for v in box]
        mask[t:b, l:r] = True
    return mask


def mirror_tile(patch, h, w):
    """Pavage en miroir d'une texture, à la taille h × w."""
    reps_y = h // patch.shape[0] + 2
    reps_x = w // patch.shape[1] + 2
    row = np.concatenate([patch if i % 2 == 0 else patch[:, ::-1] for i in range(reps_x)], axis=1)
    full = np.concatenate([row if i % 2 == 0 else row[::-1] for i in range(reps_y)], axis=0)
    return full[:h, :w]


def clean_box(img, alpha, box):
    """Refait le mur dans `box` (left, top, right, bottom, px) : ses grandes variations de lumière,
    prolongées depuis le mur autour (membrane harmonique, au quart, sans ce que `alpha` détoure :
    la femme, les objets), et un grain de la force de celui du mur autour (le mur neuf est lisse :
    rien n'est recopié d'ailleurs), puis un fondu de 6 px vers la photo autour."""
    h2, w2 = alpha.shape
    feather, sub = 6, 4
    m = 4 * sub
    e = [max(box[0] - m, 0), max(box[1] - m, 0), min(box[2] + m, w2), min(box[3] + m, h2)]
    e[2] = e[0] + (e[2] - e[0]) // sub * sub
    e[3] = e[1] + (e[3] - e[1]) // sub * sub
    work = img[e[1]:e[3], e[0]:e[2]]
    hole = np.zeros(work.shape[:2], dtype=bool)
    hole[box[1] - e[1]:box[3] - e[1], box[0] - e[0]:box[2] - e[0]] = True
    valid = ~hole & (alpha[e[1]:e[3], e[0]:e[2]] < 0.02)  # le mur seul : ni le trou, ni la femme
    hs, ws = (e[3] - e[1]) // sub, (e[2] - e[0]) // sub
    vsum = (work * valid[..., None]).reshape(hs, sub, ws, sub, 3).sum(axis=(1, 3))
    vcount = valid.reshape(hs, sub, ws, sub).sum(axis=(1, 3))
    known = vcount == sub * sub
    small = vsum / np.maximum(vcount, 1)[..., None]
    membrane_small = harmonic(np.where(known[..., None], small, 0), ~known)
    membrane_small[known] = small[known]
    yy = (np.arange(e[3] - e[1]) + 0.5) / sub - 0.5
    xx = (np.arange(e[2] - e[0]) + 0.5) / sub - 0.5
    gy, gx = np.meshgrid(np.clip(yy, 0, hs - 1), np.clip(xx, 0, ws - 1), indexing='ij')
    membrane = np.dstack([ndimage.map_coordinates(membrane_small[..., c], [gy, gx], order=1) for c in range(3)])
    lum = work @ np.array([0.2126, 0.7152, 0.0722])
    fine = lum - ndimage.gaussian_filter(lum, 3)
    # Force du grain : écart absolu médian (les bords d'objets autour ne comptent pas).
    sigma = 1.4826 * float(np.median(np.abs(fine[valid]))) if valid.any() else 1.0
    noise = ndimage.gaussian_filter(np.random.default_rng(7).normal(0, 1, lum.shape), 0.6)
    noise *= sigma / max(float(noise.std()), 1e-6)
    filled = np.clip(membrane + noise[..., None], 0, 255)
    dist = ndimage.distance_transform_edt(~hole)
    weight = np.clip(1 - dist / feather, 0, 1)[..., None]
    out = img.copy()
    out[e[1]:e[3], e[0]:e[2]] = weight * filled + (1 - weight) * work
    return out


meta = {}
for size in sizes:
    L, T, W, H = RECTS[size]
    photo = Image.open(os.path.join(PHOTOS, f'pose-{size}.jpeg')).convert('RGB')
    alpha_full = Image.open(os.path.join(MASKS, f'pose-{size}.png')).convert('L')
    full_w, full_h = photo.size
    w2, h2 = int(full_w * SCALE), int(full_h * SCALE)
    img = np.asarray(photo.resize((w2, h2), Image.LANCZOS), dtype=np.float64)
    # Le rectangle blanc se cherche sur la photo telle quelle, la balance des blancs ensuite.
    l, t, r, b = [int(round(v * SCALE)) for v in (L, T, L + W, T + H)]
    has_rect = (img[t:b, l:r].min(axis=2) > 245).mean() > 0.6
    gains = balance(img)
    img = np.clip(img * gains, 0, 255)
    alpha = np.clip(np.asarray(alpha_full.resize((w2, h2), Image.LANCZOS), dtype=np.float64) / 255.0, 0, 1)

    # Contour de la femme et de sa tête (photo d'origine), pour le cadrage : pixels nettement à elle.
    a_full = np.asarray(alpha_full, dtype=np.uint8)
    ys, xs = np.nonzero(a_full > 128)
    person = [int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1]
    head_rows = a_full[person[1]:person[1] + HEAD_CM * PX_PER_CM] > 128
    hx = np.nonzero(head_rows.any(axis=0))[0]
    head = [int(hx.min()), person[1], int(hx.max()) + 1, person[1] + HEAD_CM * PX_PER_CM]
    reach = far_arm(a_full, person, head)
    # Zones à refaire, à demi-échelle, seulement si elles sont là (les photos retouchées n'ont plus de
    # rectangle blanc ni de trait) : le rectangle, élargi de 4 px (bords adoucis du dessin), et les
    # traits laissés autour par la génération.
    # Ce qui passe devant le mur : la femme, et les objets d'une photo meublée (le rectangle blanc,
    # lui, n'en est pas un).
    rect_box = (max(l - 4, 0), max(t - 4, 0), min(r + 4, w2), min(b + 4, h2))
    in_rect = np.zeros((h2, w2), dtype=bool)
    if has_rect:
        in_rect[max(rect_box[1] - 4, 0):rect_box[3] + 4, max(rect_box[0] - 4, 0):rect_box[2] + 4] = True
    # Deux passes : les objets autour du rectangle d'abord (pour refaire le mur sans eux), puis sur le
    # mur refait, où rien ne reste du bord du rectangle.
    front = np.maximum(alpha, object_key(img, alpha, ndimage.binary_dilation(in_rect, iterations=20)))
    cleaned = img
    if has_rect:
        cleaned = clean_box(img, front, rect_box)
        for mark in MARKS.get(size, []):
            cleaned = clean_box(cleaned, front, [int(round(v * SCALE)) for v in mark])
    objects = object_key(cleaned, alpha)
    front = np.maximum(alpha, objects)
    Image.fromarray((objects * 255 + 0.5).astype(np.uint8), 'L').save(os.path.join(out_dir, f'controle-objets-{size}.png'))
    # Marges sans rien devant le mur, recopiées en miroir pour le prolonger au-delà des bords gauche
    # et droit (3 cm de garde) : un objet au bord, et ce côté se prolonge uni (le haut, toujours).
    guard = 3 * PX_PER_CM
    solid = front > 0.5
    labels, count = ndimage.label(solid)
    if count:
        areas = ndimage.sum(solid, labels, range(1, count + 1))
        solid = np.isin(labels, 1 + np.nonzero(areas >= (2.5 * PX_PER_CM * SCALE) ** 2)[0])  # plus de 2,5 cm de côté environ
    fy, fx = np.nonzero(solid)
    clean = {
        'left': max(0, int(fx.min() / SCALE) - guard),
        'right': max(0, full_w - int((fx.max() + 1) / SCALE) - guard),
    }

    # Calque de la femme : la zone du tableau et de son ombre seulement, à demi-échelle. Ses
    # couleurs sont estimées sans le mur ni le rectangle (pas de liseré clair sur l'œuvre).
    # La zone de ce tableau-ci seulement (le 30 × 40 n'a que faire de l'olivier).
    z = [int(round(v * SCALE)) for v in painted(RECTS[size])]
    z = [max(z[0], 0), max(z[1], 0), min(z[2], w2), min(z[3], h2)]
    crop = front[z[1]:z[3], z[0]:z[2]]
    ys2, xs2 = np.nonzero(crop > 0.004)
    if len(ys2):
        c = [z[0] + int(xs2.min()), z[1] + int(ys2.min()), z[0] + int(xs2.max()) + 1, z[1] + int(ys2.max()) + 1]
    else:
        c = [z[0], z[1], z[0] + 2, z[1] + 2]
    # Un peu de mur autour, pour l'estimation des couleurs, puis le recadrage exact.
    m = 24
    e = [max(c[0] - m, 0), max(c[1] - m, 0), min(c[2] + m, w2), min(c[3] + m, h2)]
    fg = estimate_foreground_ml(img[e[1]:e[3], e[0]:e[2]] / 255.0, front[e[1]:e[3], e[0]:e[2]])
    fg = fg[c[1] - e[1]:c[3] - e[1], c[0] - e[0]:c[2] - e[0]]
    a = front[c[1]:c[3], c[0]:c[2]]
    rgba = np.dstack([np.clip(fg * 255 + 0.5, 0, 255), np.clip(a * 255 + 0.5, 0, 255)]).astype(np.uint8)
    Image.fromarray(rgba, 'RGBA').save(os.path.join(out_dir, f'pose-{size}-femme.webp'), quality=90, alpha_quality=100, method=6)
    # La photo publiée : le mur refait, la femme par-dessus avec son détourage ; près du tableau,
    # avec ses couleurs estimées (pas de liseré blanc du rectangle autour de sa main).
    a3 = alpha[..., None]
    person_rgb = img.copy()
    person_rgb[c[1]:c[3], c[0]:c[2]] = fg * 255
    out = a3 * person_rgb + (1 - a3) * cleaned
    Image.fromarray(np.clip(out + 0.5, 0, 255).astype(np.uint8)).save(os.path.join(out_dir, f'pose-{size}.jpg'), quality=80, optimize=True, progressive=True)

    # Lumière du mur, sans la femme ni les meubles, en cases d'environ 3 cm : le moteur
    # prolonge la photo au-delà de ses bords à la lumière du bord (en miroir : pas de creux ni de bosse
    # au raccord, malgré l'assombrissement des coins ; uni là où un objet touche le bord), et éclaire
    # le tableau comme le mur. Derrière un meuble, au-dessus de la plinthe : le mur prolongé depuis
    # autour (harmonique) ; plinthe et sol : rang par rang, depuis les cases dégagées.
    by = bx = round(3 * PX_PER_CM * SCALE)
    gh, gw = h2 // by, w2 // bx
    things = furniture(objects, alpha)
    Image.fromarray((things * 255).astype(np.uint8), 'L').save(os.path.join(out_dir, f'controle-meubles-{size}.png'))
    wall = ((1 - front) * ~things)[:gh * by, :gw * bx]
    total = (out[:gh * by, :gw * bx] * wall[..., None]).reshape(gh, by, gw, bx, 3).sum(axis=(1, 3))
    count = wall.reshape(gh, by, gw, bx).sum(axis=(1, 3))
    seen = count > 0.5 * by * bx
    low = total / np.maximum(count, 1e-6)[..., None]
    split = int(PLINTH * SCALE) // by  # premier rang de cases qui touche la plinthe
    upper = seen[:split]
    filled_low = harmonic(np.where(upper[..., None], low[:split], 0), ~upper)
    low[:split][~upper] = filled_low[~upper]
    # Plinthe et sol : les cases ni à elle ni au pot, et pas plus sombres que la plinthe ou le parquet
    # du rang (pieds du banc, panier, chaussures, trépied), puis entre elles et jusqu'aux bords.
    floor = ((1 - alpha) * ~ndimage.binary_dilation(furniture_boxes(h2, w2), iterations=6))[:gh * by, :gw * bx]
    f_total = (out[:gh * by, :gw * bx] * floor[..., None]).reshape(gh, by, gw, bx, 3).sum(axis=(1, 3))
    f_count = floor.reshape(gh, by, gw, bx).sum(axis=(1, 3))
    f_low = f_total / np.maximum(f_count, 1e-6)[..., None]
    cells = np.arange(gw)
    for row in range(split, gh):
        ok = f_count[row] > 0.5 * by * bx
        if ok.any():
            lum = f_low[row] @ np.array([0.2126, 0.7152, 0.0722])
            ok &= lum >= 0.9 * np.percentile(lum[ok], 75)
        if not ok.any():
            low[row] = low[row - 1]
            continue
        for ch in range(3):
            low[row, :, ch] = np.interp(cells, cells[ok], f_low[row, ok, ch])
    Image.fromarray(np.clip(low + 0.5, 0, 255).astype(np.uint8)).save(os.path.join(out_dir, f'pose-{size}-lumiere.png'), optimize=True)
    meta[size] = {
        'rect': [L, T, W, H],
        'person': person,
        'head': head,
        # Calque, en px de la photo d'origine : left, top, right, bottom.
        'overlay': [int(v / SCALE) for v in c],
        'clean': clean,
        'balance': [round(float(g), 4) for g in gains],
    }
    if reach:
        meta[size]['reach'] = reach
    print(size, json.dumps(meta[size]), flush=True)

path = os.path.join(out_dir, 'poses.json')
old = json.load(open(path)) if os.path.exists(path) else {'poses': {}}
old['poses'].update(meta)
old.update({'size': [full_w, full_h], 'published': [w2, h2]})
with open(path, 'w') as f:
    json.dump(old, f, indent=1)
print('ok')
