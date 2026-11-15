# Silhouette du poster A : une feuille tenue en haut, qui s'est un peu relâchée.
# Un seul modèle d'onde pour tout : crêtes (papier le plus loin du mur) en bas à x = 27 % et 71 %
# (période 44 %). Le bord bas descend sur les crêtes et remonte dans les creux ; les côtés s'ouvrent
# vers le bas ; le coin bas droit, soulevé, va jusqu'au coin de la boîte et s'arrondit.
# Sortie : la valeur CSS de clip-path (x en %, retraits en cqw : la même vignette à toutes les tailles).
import math, sys

CRESTS = (0.27, 0.71)
PERIOD = 0.44
R_SIDE = 0.75     # retrait des côtés dans la moitié haute (cqw)
R_BOTTOM = 0.85   # retrait moyen du bord bas (cqw)
AMP = 0.5         # demi-amplitude de l'onde du bord bas (cqw)
FLARE_FROM = 0.84 # le coin droit s'écarte à partir de 84 % de la largeur
LEFT_BOTTOM = 1.0 # retrait du bord bas au coin gauche, côté lumière, resté près du mur (le coin droit, soulevé, va à 0)
LEFT_SIDE = 0.45  # retrait du côté gauche en bas : il s'ouvre un peu, moins que le droit
CORNER_R = 1.1    # arrondi du coin soulevé (cqw)

def crest(x):
    return math.cos(2 * math.pi * (x - CRESTS[0]) / PERIOD)

def smooth(t):
    t = min(1, max(0, t))
    return t * t * (3 - 2 * t)

def fmt(v):
    s = f'{v:.2f}'.rstrip('0').rstrip('.')
    return s if s not in ('-0', '') else '0'

def X(pct, inset_right=None, inset_left=None):
    if inset_right is not None:
        return f'calc(100% - {fmt(inset_right)}cqw)' if inset_right > 0.005 else '100%'
    if inset_left is not None:
        return f'{fmt(inset_left)}cqw' if inset_left > 0.005 else '0'
    return f'{fmt(pct)}%'

def Y(pct=None, inset_bottom=None):
    if inset_bottom is not None:
        return f'calc(100% - {fmt(inset_bottom)}cqw)' if inset_bottom > 0.005 else '100%'
    return f'{fmt(pct)}%'

pts = []
# Bord haut, droit (tenu).
pts.append((X(None, inset_left=R_SIDE), '0'))
pts.append((X(None, inset_right=R_SIDE), '0'))
# Côté droit : droit en haut, il s'ouvre vers le bas jusqu'au coin soulevé (retrait 0), un léger frisson.
for i in range(1, 14):
    y = i / 14
    open_ = smooth((y - 0.42) / 0.58)
    inset = R_SIDE * (1 - open_) + 0.12 * math.sin(math.pi * 2.2 * y) * (1 - open_) * y
    if y > 0.93:
        break
    pts.append((X(None, inset_right=max(0, inset)), Y(y * 100)))
# Coin bas droit soulevé : un quart d'arrondi qui touche le coin de la boîte.
for k in range(0, 5):
    a = (math.pi / 2) * k / 4
    ix = CORNER_R * (1 - math.cos(a))
    iy = CORNER_R * (1 - math.sin(a))
    # du bord droit (a = 0) au bord bas (a = 90°)
    pts.append((X(None, inset_right=ix * 0.6), Y(inset_bottom=iy * 0.6) if iy > 0.005 else '100%'))
# Bord bas, de droite à gauche : l'onde, qui s'efface vers le coin soulevé.
for i in range(1, 40):
    x = 1 - i / 40
    flare = smooth((x - FLARE_FROM) / (1 - FLARE_FROM))
    left_ease = smooth(x / 0.12)            # le coin gauche reste au retrait du côté gauche
    inset = (R_BOTTOM - AMP * crest(x)) * (1 - flare)
    inset = inset * left_ease + LEFT_BOTTOM * (1 - left_ease)
    pts.append((X(x * 100), Y(inset_bottom=max(0, inset))))
# Côté gauche : du coin bas (un peu ouvert) au haut (retrait des côtés).
for i in range(0, 14):
    y = 1 - i / 14
    open_ = smooth((y - 0.42) / 0.58)
    inset = R_SIDE * (1 - open_) + LEFT_SIDE * open_
    pts.append((X(None, inset_left=inset), Y(y * 100) if i else Y(inset_bottom=LEFT_BOTTOM)))

poly = 'polygon(' + ', '.join(f'{x} {y}' for x, y in pts) + ')'
print(poly)
print(len(pts), 'points', file=sys.stderr)
