# ⚡ FlexScreener Tertiaire

**FlexScreener** est un outil de prospection B2B conçu pour l'équipe Growth/SDR de **Tilt Energy**. Il permet d'identifier instantanément le potentiel d'effacement électrique (CVC) des bâtiments tertiaires sur une zone géographique donnée.

## 🎯 Objectifs
Dans le cadre du Décret BACS, de nombreux bâtiments s'équipent de GTB. Cet outil croise plusieurs bases de données de l'État pour :
1. Trouver les grands bâtiments tertiaires chauffés/climatisés à l'électricité.
2. Identifier l'entreprise qui occupe les lieux.
3. Estimer la puissance flexible (kW) et le gain financier annuel (€/an) pour un contrat d'effacement.

## 🛠️ Fonctionnement Technique
L'application fonctionne à 100% côté client (Front-end Vanilla JS) et repose sur des Open Data :
* **API ADEME (DPE Tertiaire) :** Filtre les surfaces et secteurs d'activité.
* **API Sirene (Gouv.fr) :** Retrouve la raison sociale à partir de l'adresse.
* **Matrice sectorielle :** Adapte le ratio thermique (W/m²) et le taux d'effacement (%) selon l'usage du bâtiment (Bureaux, Commerces, Santé...).

## 🚀 Utilisation (SDR)
1. Entrez un **Code Postal** (ex: 69003).
2. Ajustez la **surface minimale** selon votre stratégie de ciblage.
3. Cliquez sur **Lancer le scan**.
4. Utilisez le bouton **Exporter en CSV** pour charger les leads qualifiés dans votre CRM (Hubspot, Salesforce...).