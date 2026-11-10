# Outil de cuisson (jamais publié) : détoure la femme des photos de pose (src/poses.js).
#
# BiRefNet, licence MIT, modèle officiel de son auteur sur Hugging Face (ZhengPeng7/BiRefNet_HR-matting),
# sur le processeur, sans clé ni service. Environ 7 minutes par photo à 2048 px. Sortie : un masque
# alpha en niveaux de gris par photo, à sa taille d'origine (6336 × 2688 depuis la version 24), que
# poses-preparer.py lit.
#
# Installation, une fois, dans un dossier court (Windows refuse les chemins de plus de 260 caractères
# que PyTorch crée) :
#   python -m venv venv
#   venv\Scripts\python -m pip install torch torchvision --index-url https://download.pytorch.org/whl/cpu
#   venv\Scripts\python -m pip install transformers timm kornia einops pillow numpy scipy pymatting
# Le modèle (424 Mo) se télécharge au premier appel, dans hf/ du dossier courant (hors du dépôt, avec
# le venv). Il charge du code du dépôt du modèle (trust_remote_code) : relu le 10/11/2026, le réseau
# de neurones seul, sans appel réseau ni commande système.
#
#   venv\Scripts\python -I poses-detourer.py <dossier des photos pose-<taille>.jpeg> <dossier des masques> [côté] [x0:x1] [tailles...]
#
# x0:x1 : les colonnes où elle se tient, seules détourées (photos larges de la version 24 : 2600:5400) ;
# le modèle travaille sur un carré, une photo 21:9 entière y serait écrasée en largeur. Hors de ces
# colonnes, le masque est vide.
import os, sys, time

os.environ.setdefault('HF_HOME', os.path.join(os.getcwd(), 'hf'))

import torch
from PIL import Image
from torchvision import transforms
from transformers import AutoModelForImageSegmentation

MODEL = 'ZhengPeng7/BiRefNet_HR-matting'
photos, out = sys.argv[1], sys.argv[2]
side = int(sys.argv[3]) if len(sys.argv) > 3 else 2048
rest = sys.argv[4:]
columns = None
if rest and ':' in rest[0]:
    columns = [int(v) for v in rest.pop(0).split(':')]
sizes = rest or ['30x40', '60x80', '75x100', '90x120']
os.makedirs(out, exist_ok=True)

t0 = time.time()
model = AutoModelForImageSegmentation.from_pretrained(MODEL, trust_remote_code=True)
model.eval()
print(f'{MODEL} chargé en {time.time() - t0:.0f} s', flush=True)

prep = transforms.Compose([
    transforms.Resize((side, side)),
    transforms.ToTensor(),
    transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
])
for size in sizes:
    image = Image.open(os.path.join(photos, f'pose-{size}.jpeg')).convert('RGB')
    x0, x1 = columns or (0, image.width)
    part = image.crop((x0, 0, x1, image.height))
    t = time.time()
    with torch.no_grad():
        pred = model(prep(part).unsqueeze(0))[-1].sigmoid()[0, 0]
    mask = Image.new('L', image.size, 0)
    mask.paste(transforms.ToPILImage()(pred).resize(part.size, Image.BICUBIC), (x0, 0))
    path = os.path.join(out, f'pose-{size}.png')
    mask.save(path)
    print(f'{size} : {time.time() - t:.0f} s -> {path}', flush=True)
