# 13: Le Publisher choisit pièce et collection

**What to build:** à la création du produit, l'IA regarde l'image et propose la pièce la plus adaptée, prise dans la bibliothèque du ticket 11, ainsi que la collection principale. L'écran de validation montre les deux propositions ; Walid peut changer l'une ou l'autre, puis un clic publie. La pièce retenue est enregistrée sur le produit, et la fiche l'utilise (ticket 12). Le serveur rend aussi la photo « dans la pièce ». Contexte et décisions : README du dossier `fiche-3d`.

**Blocked by:** 09 (du Publisher à la fiche), 12 (vue dans une pièce)

**Status:** ready-for-agent

- [ ] Une pièce et une collection sont proposées pour chaque image, et se changent sur l'écran de validation.
- [ ] La pièce retenue est enregistrée sur le produit et utilisée par la fiche.
- [ ] La photo « dans la pièce » fait partie des photos du produit, avec un texte alternatif écrit par Claude.
- [ ] Sur 10 images de test, Walid juge les choix de l'IA corrects au moins 8 fois.
