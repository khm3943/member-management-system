// Firebase 설정
const firebaseConfig = {
    apiKey: "AIzaSyBQKKW65qAGNpa1G51hf2ntRw10hZNg8s0",
    authDomain: "member-system-d4684.firebaseapp.com",
    projectId: "member-system-d4684",
    storageBucket: "member-system-d4684.firebasestorage.app",
    messagingSenderId: "904998203480",
    appId: "1:904998203480:web:6686cdc25fff8bdae75a2d"
};

// 티어 설정
const TIERS = [
    { name: 'Unranked', ko: '언랭', class: 'tier-unranked' },
    { name: 'Gold', ko: '골드', class: 'tier-gold' },
    { name: 'Platinum', ko: '플래티넘', class: 'tier-platinum' },
    { name: 'Emerald', ko: '에메랄드', class: 'tier-emerald' },
    { name: 'Diamond', ko: '다이아몬드', class: 'tier-diamond' },
    { name: 'Master', ko: '마스터', class: 'tier-master' },
    { name: 'GrandMaster', ko: '그랜드마스터', class: 'tier-grandmaster' },
    { name: 'Challenger', ko: '챌린저', class: 'tier-challenger' }
];

// 포지션 설정
const POSITIONS = ['탑', '정글', '미드', '원딜', '서폿'];

// 티어 클래스 가져오기
function getTierClass(tierName) {
    const tier = TIERS.find(t => 
        t.name.toLowerCase() === tierName.toLowerCase() ||
        t.ko === tierName
    );
    return tier ? tier.class : 'tier-unranked';
}
