export const translations = {
  en: {
    // Header
    signUp: "Sign Up",
    login: "Login",
    
    // Navigation
    slots: "Slot Machines",
    newGames: "New Games",
    liveCasino: "Live Casino",
    searchPlaceholder: "Search a game...",
    top: "Top",
    
    // Games
    gatesOfOlympus: "Gates of Olympus",
    bookOfRa: "Book of Ra",
    coinStrike: "Coin Strike 2",
    luckyLady: "Lucky Lady's Charm",
    liveRoulette: "Live Roulette",
    blackjackVip: "Blackjack VIP",
    megaFortune: "Mega Fortune",
    starburst: "Starburst",
    sweetBonanza: "Sweet Bonanza",
    lightningDice: "Lightning Dice",
    plinko: "Plinko",
    mines: "Mines",
    chickenRoad: "Chicken Road",
    
    // Footer
    footerText: "Play-money only. No real gambling. For entertainment purposes only.",
    
    // Menu
    home: "Home",
    allGames: "All Games",
    myProfile: "My Profile",
    wallet: "Wallet",
  },
  fr: {
    // Header
    signUp: "S'inscrire",
    login: "Se connecter",
    
    // Navigation
    slots: "Machines à Sous",
    newGames: "Nouveaux Jeux",
    liveCasino: "Live Casino",
    searchPlaceholder: "Rechercher un jeu...",
    top: "Top",
    
    // Games
    gatesOfOlympus: "Gates of Olympus",
    bookOfRa: "Book of Ra",
    coinStrike: "Coin Strike 2",
    luckyLady: "Lucky Lady's Charm",
    liveRoulette: "Roulette en Direct",
    blackjackVip: "Blackjack VIP",
    megaFortune: "Mega Fortune",
    starburst: "Starburst",
    sweetBonanza: "Sweet Bonanza",
    lightningDice: "Lightning Dice",
    plinko: "Plinko",
    mines: "Mines",
    chickenRoad: "Chicken Road",
    
    // Footer
    footerText: "Jeu fictif uniquement. Pas de vrai jeu d'argent. À des fins de divertissement uniquement.",
    
    // Menu
    home: "Accueil",
    allGames: "Tous les Jeux",
    myProfile: "Mon Profil",
    wallet: "Portefeuille",
  },
};

export type Language = "en" | "fr";
export type TranslationKey = keyof typeof translations.en;
