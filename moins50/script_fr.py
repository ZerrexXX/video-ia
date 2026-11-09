"""Voix off de « Ça fait quoi de vivre dans une ville à -50°C ? ».

Chaque réplique est calée sur un créneau (début, fin) en secondes, d'après
prompts/vivre-a-moins-50.md.

Syntaxe :
  *mot*          -> mot-clé en cyan glacé dans les sous-titres
  {affiché|dit}  -> texte affiché à l'écran / texte prononcé par la voix
"""

DURATION = 60.0

LINES = [
    (0.15, 4.45, "Chez moi, il fait {*-50.*|moins cinquante.} Et ce matin, c'est une journée normale."),
    (4.45, 10.45, "Il est {9 h.|neuf heures.} Il fait encore *nuit.* Le soleil se lève à {10 h|dix heures} "
                "et se couche à {15 h.|quinze heures.}"),
    (10.45, 18.0, "Dehors, mes cils *gèlent* en trente secondes. Mon téléphone, lui, s'éteint en cinq minutes."),
    (18.0, 26.0, "Les voitures ? On ne les éteint *jamais* de l'hiver. Sinon, le moteur ne redémarre pas "
                 "avant le printemps."),
    (26.0, 34.0, "La ville est construite sur *pilotis.* Le sol est gelé sur des centaines de mètres : "
                 "si on le chauffe, les immeubles s'enfoncent."),
    (34.0, 42.0, "Au marché, pas besoin de congélateur. Le poisson tient *debout* tout seul."),
    (42.0, 50.0, "Et si tu lances de l'eau *bouillante...* elle n'atteint jamais le sol."),
    (50.0, 60.0, "Les gens me demandent comment on survit ici. Moi, je leur demande comment ils survivent sans ça."),
]
