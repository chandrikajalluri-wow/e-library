const badWords = [
    'abuse',
    'badwords',
    'idiot',
    'stupid',
    'hell',
    'damn',
    'shit',
    'fuck',
    'bitch',
    'asshole',
    'bastard'
];

export const maskProfanity = (text: string): string => {
    if (!text) return text;

    let maskedText = text;
    badWords.forEach(word => {
        const regex = new RegExp(`\\b${word}\\b`, 'gi');
        maskedText = maskedText.replace(regex, '*'.repeat(word.length));
    });
    return maskedText;
};
