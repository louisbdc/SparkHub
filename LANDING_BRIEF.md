# Sparkhub — Brief Landing Page

## Concept du produit

Sparkhub est une **plateforme de gestion de projets** conçue pour les agences et freelances qui travaillent avec des clients. L'idée centrale : chaque projet vit dans un **workspace isolé** où l'équipe (développeurs, designers, chefs de projet) et le client collaborent dans le même espace — sans friction, sans email, sans outil dispersé.

Chaque utilisateur peut créer ses propres workspaces et en être l'administrateur complet. Quand on est invité dans le workspace de quelqu'un d'autre, on y a le rôle que le propriétaire nous attribue.

### Ce que Sparkhub permet
- **Kanban board** — tickets organisés par statut (Backlog → Todo → En cours → Review → Done), drag & drop, filtres par priorité / type / assigné
- **Tickets détaillés** — titre, description, type (bug / feature / tâche / amélioration), priorité, assigné, pièces jointes, sous-tickets
- **Chat en temps réel** — messagerie par workspace avec indicateur de frappe live
- **Gestion de fichiers** — upload et prévisualisation des pièces jointes par workspace
- **Notifications** — cloche en temps réel, clic redirige vers le ticket concerné
- **Membres** — invitation par email, gestion des rôles par workspace
- **Dashboard personnel** — vue d'ensemble de tous ses workspaces, tickets urgents, tickets assignés

---

## Style visuel

### Philosophie
Design **minimaliste et professionnel**. Pas de couleur d'accentuation — la palette est strictement neutre (zinc/gris), le contraste est assuré par le noir et le blanc purs. L'interface s'efface pour laisser parler le contenu.

### Palette
| Rôle | Light | Dark |
|---|---|---|
| Background | `#fafafa` | `#09090b` |
| Surface (card) | `white/70` + blur | `zinc-900/80` + blur |
| Texte principal | `zinc-900` | `zinc-100` |
| Texte secondaire | `zinc-500` | `zinc-400` |
| Bordures | `zinc-200` | `white/10` |
| CTA principal | `zinc-900` (noir pur) | `white` |
| Labels mono | `zinc-400` uppercase | `zinc-500` uppercase |

Pas de couleur de brand — le logo Sparkhub apporte la seule touche distinctive.

### Typographie
- **Corps** : Geist Sans — propre, moderne, sans serif technique
- **Labels / badges** : Geist Mono — `uppercase`, `tracking-[0.2em]`, taille `10px`
- **Titres** : `font-bold`, `tracking-tight`
- **CTAs** : `uppercase`, `tracking-wide`, `font-bold`

### Composants clés
- **Cards** : `rounded-[2.5rem]`, `backdrop-blur-2xl`, ombre diffuse `shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)]`, border `border-zinc-200/50`
- **Boutons** : `rounded-2xl`, noir pur sur blanc, shimmer subtil au hover (`via-white/10` de gauche à droite), `active:scale-[0.98]`
- **Inputs** : `rounded-xl`, `bg-white/50`, focus change de border sans ring coloré
- **Badges / status** : arrondis pleins, couleurs sémantiques douces (slate, blue, yellow, emerald, red) pour les priorités et statuts

### Animations
- Transitions légères partout (`duration-200` à `duration-500`)
- `animate-in fade-in zoom-in-95` pour les apparitions de modales/panels
- Shimmer sur les skeletons de chargement
- Bouton submit : shimmer de gauche à droite au hover

---

## Background de la page de connexion

C'est le background que tu adores — voici exactement comment il est construit :

### Structure
Fond uni `#fafafa` (light) / `#09090b` (dark), puis 4 couches superposées en `absolute inset-0 pointer-events-none` :

### 1. Grille fine
```css
background-image:
  linear-gradient(#e5e7eb 1px, transparent 1px),
  linear-gradient(90deg, #e5e7eb 1px, transparent 1px);
background-size: 64px 64px;
opacity: 0.4 (light) / 0.08 (dark)
```
Grille carrée subtile qui donne de la profondeur sans distraire.

### 2. Widgets flottants
Trois éléments UI décoratifs positionnés en `absolute`, stylisés comme de vrais composants :
- **En haut à gauche** — icône `MessageSquare` dans une card bordée, badge de notification `"3"`, label mono `realtime_chat`
- **En haut à droite** — mini kanban avec barres de progression, label mono `kanban_board`
- **En bas à droite** — cercle en tirets avec icône `Layout` + petit badge `PenTool`, label mono `workspace`

Chaque widget a une animation CSS `float` douce et perpétuelle :
```css
@keyframes float {
  0%, 100% { transform: translateY(0) rotate(-6deg); }
  50%       { transform: translateY(-20px) rotate(-4deg); }
}
/* .animate-float : 6s — .animate-float-delayed : 8s */
```
Opacité `opacity-40` (light) / `opacity-[0.15]` (dark) — présents mais discrets.

### 3. Connecteurs SVG
Deux courbes de Bézier en tirets reliant les widgets :
```html
<path d="M150,250 Q300,400 500,350 T850,200" strokeDasharray="8 8" />
<path d="M100,700 C250,850 450,600 550,800 S800,900 950,750" />
```
`opacity-[0.15]` (light) / `opacity-[0.04]` (dark)

### 4. Glow souris
```css
radial-gradient(600px circle at {mouseX}px {mouseY}px, rgba(0,0,0,0.03), transparent)
```
Suivi de la souris en temps réel — effet de lumière très subtil qui donne vie à la page.

---

## Orientation pour la landing page

### Ton
Professionnel, direct, français. Pas de promesses vagues — des features concrètes. Style "outil sérieux pour gens sérieux".

### Structure suggérée
1. **Hero** — headline percutant + sous-titre + CTA "Créer un espace" / "Voir une démo" + capture d'écran du kanban
2. **Features** — 3–4 blocs (Kanban, Chat temps réel, Workspaces, Fichiers)
3. **Comment ça marche** — 3 étapes simples (Créer un workspace → Inviter le client → Collaborer)
4. **CTA final** — invitation à créer son premier workspace

### À réutiliser de la page de connexion
- Le background (grille + widgets flottants + connecteurs SVG + glow souris) comme hero background
- Le style des cards (`rounded-[2.5rem]`, backdrop blur) pour les blocs features
- Les labels mono uppercase pour les badges de section
- Le bouton CTA noir pur avec shimmer hover
