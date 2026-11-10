# Outil de cuisson (jamais publié) : prépare les photos de pose (src/poses.js) à partir des photos
# d'origine et des masques de poses-detourer.py. Pour chaque taille, dans le dossier de sortie :
# - pose-<taille>.jpg : la photo à 2400 px de large, le rectangle blanc et le trait de crayon sous
#   lui effacés (le mur refait : sa lumière prolongée depuis autour, son grain pris au mur à gauche) ;
# - pose-<taille>-femme.png : la femme seule (couleurs estimées sans le mur, pymatting, licence MIT,
#   et son détourage), là seulement où le tableau et son ombre peuvent passer ;
# - pose-<taille>-lumiere.png : la lumière du mur sans la femme, en cases d'environ 3 cm ;
# - poses.json : les mesures recopiées dans src/poses.js (femme, tête, calque, bandes sans la femme).
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

SCALE = 0.5  # 4800 -> 2400 px
PX_PER_CM = 16  # photos d'origine, dans le plan du mur
HEAD_CM = 24  # hauteur de la tête, cheveux compris, depuis le haut de la femme
# Rectangles blancs (photo d'origine) : left, top, width, height.
RECTS = {
    '30x40': (1776, 504, 480, 640),
    '60x80': (1320, 184, 960, 1280),
    '75x100': (1200, 24, 1200, 1600),
    '90x120': (1080, 26, 1440, 1920),
}
sizes = sys.argv[4:] or list(RECTS)
# Traits laissés sur le mur par la génération, près du rectangle (photo d'origine) : à refaire aussi.
# Le même trait de crayon, sous le rectangle, sur les quatre photos : effacé partout (les poses se
# fondent l'une dans l'autre).
MARKS = {size: [(1176, 1972, 1604, 2036)] for size in RECTS}
# Zone où le tableau et son ombre peuvent passer, toutes tailles et cadres confondus (photo
# d'origine) : union des rectangles, agrandie de 4 cm (cadre) à gauche et en haut, de 18 cm (ombre,
# vers le bas à droite) à droite et en bas. Le calque de la femme n'est utile que là.
UNION = (min(r[0] for r in RECTS.values()), min(r[1] for r in RECTS.values()),
         max(r[0] + r[2] for r in RECTS.values()), max(r[1] + r[3] for r in RECTS.values()))
ZONE = (UNION[0] - 4 * PX_PER_CM, max(0, UNION[1] - 4 * PX_PER_CM), UNION[2] + 18 * PX_PER_CM, UNION[3] + 18 * PX_PER_CM)


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


def mirror_tile(patch, h, w):
    """Pavage en miroir d'une texture, à la taille h × w."""
    reps_y = h // patch.shape[0] + 2
    reps_x = w // patch.shape[1] + 2
    row = np.concatenate([patch if i % 2 == 0 else patch[:, ::-1] for i in range(reps_x)], axis=1)
    full = np.concatenate([row if i % 2 == 0 else row[::-1] for i in range(reps_y)], axis=0)
    return full[:h, :w]


def clean_box(img, alpha, box, source_right):
    """Refait le mur dans `box` (left, top, right, bottom, px) : ses grandes variations de lumière,
    prolongées depuis le mur autour (membrane harmonique, au quart), et son grain, pris au mur dégagé
    à gauche de `source_right` (passe-haut), puis un fondu de 6 px vers la photo autour."""
    h2, w2 = alpha.shape
    feather, sub = 6, 4
    sx0, sx1 = 20, max(40, source_right - 20)
    if alpha[box[1]:box[3], sx0:sx1].max() >= 0.02:
        raise SystemExit('la texture source touche la femme')
    rows = img[box[1]:box[3], sx0:sx1]
    grain = rows - ndimage.gaussian_filter(rows, (12, 12, 0), mode='reflect')
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
    texture = np.zeros_like(work)
    hb, wb = box[3] - box[1], box[2] - box[0]
    tile = mirror_tile(grain, hb + 2 * feather, wb + 2 * feather)
    oy, ox = box[1] - e[1] - feather, box[0] - e[0] - feather
    y0, x0 = max(oy, 0), max(ox, 0)
    part = tile[y0 - oy:, x0 - ox:][:texture.shape[0] - y0, :texture.shape[1] - x0]
    texture[y0:y0 + part.shape[0], x0:x0 + part.shape[1]] = part
    filled = np.clip(membrane + texture, 0, 255)
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
    alpha = np.clip(np.asarray(alpha_full.resize((w2, h2), Image.LANCZOS), dtype=np.float64) / 255.0, 0, 1)

    # Contour de la femme et de sa tête (photo d'origine), pour le cadrage : pixels nettement à elle.
    a_full = np.asarray(alpha_full, dtype=np.uint8)
    ys, xs = np.nonzero(a_full > 128)
    person = [int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1]
    head_rows = a_full[person[1]:person[1] + HEAD_CM * PX_PER_CM] > 128
    hx = np.nonzero(head_rows.any(axis=0))[0]
    head = [int(hx.min()), person[1], int(hx.max()) + 1, person[1] + HEAD_CM * PX_PER_CM]
    # Marges sans la femme, recopiées en miroir pour prolonger le mur au-delà des bords (3 cm de garde).
    guard = 3 * PX_PER_CM
    clean = {'left': person[0] - guard, 'right': full_w - person[2] - guard, 'top': person[1] - guard}

    # Zones à refaire, à demi-échelle : le rectangle, élargi de 4 px (bords adoucis du dessin), et
    # les traits laissés autour par la génération.
    l, t, r, b = [int(round(v * SCALE)) for v in (L, T, L + W, T + H)]
    cleaned = clean_box(img, alpha, (max(l - 4, 0), max(t - 4, 0), min(r + 4, w2), min(b + 4, h2)), l)
    for mark in MARKS.get(size, []):
        box = [int(round(v * SCALE)) for v in mark]
        cleaned = clean_box(cleaned, alpha, box, box[0])

    # Calque de la femme : la zone du tableau et de son ombre seulement, à demi-échelle. Ses
    # couleurs sont estimées sans le mur ni le rectangle (pas de liseré clair sur l'œuvre).
    z = [int(round(v * SCALE)) for v in ZONE]
    z = [max(z[0], 0), max(z[1], 0), min(z[2], w2), min(z[3], h2)]
    crop = alpha[z[1]:z[3], z[0]:z[2]]
    ys2, xs2 = np.nonzero(crop > 0.004)
    if len(ys2):
        c = [z[0] + int(xs2.min()), z[1] + int(ys2.min()), z[0] + int(xs2.max()) + 1, z[1] + int(ys2.max()) + 1]
    else:
        c = [z[0], z[1], z[0] + 2, z[1] + 2]
    # Un peu de mur autour, pour l'estimation des couleurs, puis le recadrage exact.
    m = 24
    e = [max(c[0] - m, 0), max(c[1] - m, 0), min(c[2] + m, w2), min(c[3] + m, h2)]
    fg = estimate_foreground_ml(img[e[1]:e[3], e[0]:e[2]] / 255.0, alpha[e[1]:e[3], e[0]:e[2]])
    fg = fg[c[1] - e[1]:c[3] - e[1], c[0] - e[0]:c[2] - e[0]]
    a = alpha[c[1]:c[3], c[0]:c[2]]
    rgba = np.dstack([np.clip(fg * 255 + 0.5, 0, 255), np.clip(a * 255 + 0.5, 0, 255)]).astype(np.uint8)
    Image.fromarray(rgba, 'RGBA').save(os.path.join(out_dir, f'pose-{size}-femme.png'), optimize=True)
    # La photo publiée : le mur refait, la femme par-dessus avec son détourage ; près du tableau,
    # avec ses couleurs estimées (pas de liseré blanc du rectangle autour de sa main).
    a3 = alpha[..., None]
    person_rgb = img.copy()
    person_rgb[c[1]:c[3], c[0]:c[2]] = fg * 255
    out = a3 * person_rgb + (1 - a3) * cleaned
    Image.fromarray(np.clip(out + 0.5, 0, 255).astype(np.uint8)).save(os.path.join(out_dir, f'pose-{size}.jpg'), quality=80, optimize=True, progressive=True)

    # Lumière du mur, sans la femme, en cases de 25 × 28 px (environ 3 cm) : le moteur prolonge la
    # photo au-delà de ses bords en miroir, en gardant la lumière du bord (pas de creux ni de bosse
    # au raccord, malgré l'assombrissement des coins).
    by, bx = 28, 25
    gh, gw = h2 // by, w2 // bx
    wall = 1 - alpha[:gh * by, :gw * bx]
    total = (out[:gh * by, :gw * bx] * wall[..., None]).reshape(gh, by, gw, bx, 3).sum(axis=(1, 3))
    count = wall.reshape(gh, by, gw, bx).sum(axis=(1, 3))
    seen = count > 0.5 * by * bx
    low = total / np.maximum(count, 1e-6)[..., None]
    filled_low = harmonic(np.where(seen[..., None], low, 0), ~seen)
    low[~seen] = filled_low[~seen]
    Image.fromarray(np.clip(low + 0.5, 0, 255).astype(np.uint8)).save(os.path.join(out_dir, f'pose-{size}-lumiere.png'), optimize=True)
    meta[size] = {
        'rect': [L, T, W, H],
        'person': person,
        'head': head,
        # Calque, en px de la photo d'origine : left, top, right, bottom.
        'overlay': [int(v / SCALE) for v in c],
        'clean': clean,
    }
    print(size, json.dumps(meta[size]), flush=True)

path = os.path.join(out_dir, 'poses.json')
old = json.load(open(path)) if os.path.exists(path) else {'poses': {}}
old['poses'].update(meta)
old.update({'size': [4800, 3584], 'published': [w2, h2]})
with open(path, 'w') as f:
    json.dump(old, f, indent=1)
print('ok')
