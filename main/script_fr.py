"""Script de la vidéo « Pourquoi c'est l'enfer d'être la main ».

Chaque scène a :
  - id     : nom de la fonction de dessin (voir scenes.py)
  - label  : grand texte d'âge affiché en haut (ou None)
  - lines  : phrases de la voix off (une phrase = un fichier audio)

Syntaxe dans les phrases :
  *mot*            -> mot surligné en jaune dans les sous-titres
  {affiché|dit}    -> texte affiché à l'écran / texte prononcé par la voix
"""

SCENES = [
    dict(id="title", label=None, lines=[
        "Pourquoi c'est *l'enfer* d'être *la* *main* ?",
    ]),
    dict(id="birth", label="JOUR 1", lines=[
        "Le jour de ta *naissance*, la première chose que fait le *bébé*...",
        "c'est te mettre dans sa *bouche*.",
        "*Bienvenue* dans la vie : t'es couverte de *bave*.",
    ]),
    dict(id="clap", label="1 AN", lines=[
        "À un an, il apprend à *applaudir*.",
        "Toute la *famille* applaudit... le *bébé*.",
        "Toi ? *Personne* ne te félicite.",
    ]),
    dict(id="socket", label="3 ANS", lines=[
        "À trois ans, il découvre les *prises* *électriques*.",
        "Et devine qui il envoie *vérifier* en premier ?",
        "*Toi*.",
    ]),
    dict(id="door", label="6 ANS", lines=[
        "À six ans, la *portière* de la voiture se referme.",
        "Sur tes *doigts*.",
        "Le gamin *hurle*, mais c'est toi qui gonfles comme une *saucisse*.",
    ]),
    dict(id="school", label="10 ANS", lines=[
        "À l'école, tu écris des *pages* et des *pages*,",
        "pendant que le *cerveau* regarde les *nuages* par la fenêtre.",
        "Et le jour du *contrôle*, la *crampe*, c'est pour toi.",
    ]),
    dict(id="nails", label="15 ANS", lines=[
        "À quinze ans, il *stresse*. Alors il se *ronge* les *ongles*.",
        "Il te *mange*. *Littéralement*.",
    ]),
    dict(id="highfive", label="16 ANS", lines=[
        "Il lève la main pour un {*check*|tchèque}...",
        "et *personne* ne répond.",
        "Tu restes là, *seule*, en l'air, pendant cinq *longues* secondes.",
    ]),
    dict(id="holding", label="20 ANS", lines=[
        "Pour la première fois, il tient la *main* de quelqu'un.",
        "Il a le *trac*. Il *transpire*.",
        "Et c'est toi qui es *trempée*.",
    ]),
    dict(id="phone", label="25 ANS", lines=[
        "Il découvre les *réseaux* *sociaux*. Douze heures par jour à {*scroller*|scroler}.",
        "Le *pouce* a parcouru trois *kilomètres*.",
        "Il demande sa *retraite*.",
    ]),
    dict(id="ring", label="30 ANS", lines=[
        "Le jour du *mariage*, on te passe une *bague* au doigt.",
        "C'est *magnifique*.",
        "Sauf qu'avec les années, elle ne s'enlève *plus* *jamais*.",
    ]),
    dict(id="stove", label="35 ANS", lines=[
        "Il *cuisine*. Il touche la *poêle*, juste pour voir si c'est *chaud*.",
        "C'était *chaud*.",
    ]),
    dict(id="handshake", label="40 ANS", lines=[
        "Il devient *directeur*. Il serre *trois* *cents* mains par jour.",
        "Trois cents mains que *personne* n'a *lavées*.",
    ]),
    dict(id="brain", label=None, lines=[
        "Et pendant tout ce temps, qui reçoit les *compliments* ?",
        "Le *cerveau*. « Quel *génie* ! »",
        "Alors que c'est *toi* qui as *tout* fait.",
    ]),
    dict(id="old", label="70 ANS", lines=[
        "Avec l'âge, tu *trembles*, tu *craques*, tu *rouilles*.",
        "Ouvrir un pot de *cornichons* devient une épreuve *olympique*.",
    ]),
    dict(id="sleep", label="84 ANS", lines=[
        "Et puis un soir, ton *propriétaire* s'endort...",
        "pour *toujours*.",
    ]),
    dict(id="funeral", label=None, lines=[
        "À l'enterrement, on te pose enfin sur sa *poitrine*.",
        "Pour la première fois de ta vie, tu te *reposes*.",
        "C'est *fini*.",
    ]),
    dict(id="heaven", label=None, lines=[
        "Mais au *paradis*, un *ange* s'approche et te tend quelque chose.",
        "Une *harpe*.",
        "Il faut *jouer*. Pour *l'éternité*.",
    ]),
]
