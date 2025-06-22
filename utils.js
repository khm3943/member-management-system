// 티어 클래스 가져오기
function getTierClass(tierName) {
    if (!tierName) return 'tier-unranked';
    
    // 티어 이름에서 숫자 제거하고 소문자로 변환
    const cleanTierName = tierName.toLowerCase().replace(/[0-9]/g, '');
    
    const tierMap = {
        'unranked': 'tier-unranked',
        'gold': 'tier-gold',
        'platinum': 'tier-platinum',
        'emerald': 'tier-emerald',
        'diamond': 'tier-diamond',
        'master': 'tier-master',
        'grandmaster': 'tier-grandmaster',
        'challenger': 'tier-challenger'
    };
    
    return tierMap[cleanTierName] || 'tier-unranked';
}

// 티어 점수 계산
function getTierScore(tier) {
    if (!tier) return 1;
    
    const tierScores = {
        'challenger': 8,
        'grandmaster': 7,
        'master': 6,
        'diamond': 5,
        'emerald': 4,
        'platinum': 3,
        'gold': 2,
        'unranked': 1
    };
    
    const tierName = tier.toLowerCase().replace(/[0-9]/g, '');
    const tierNumber = parseInt(tier.match(/\d+/)?.[0]) || 0;
    const baseScore = tierScores[tierName] || 1;
    
    // 숫자가 낮을수록 높은 티어 (Diamond1 > Diamond4)
    return baseScore + (5 - tierNumber) * 0.1;
}

// OP.GG 링크 생성
function getOpggLink(nickname) {
    const converted = nickname.replace('#', '-');
    return `https://op.gg/ko/lol/summoners/kr/${encodeURIComponent(converted)}`;
}

// CSV 내보내기 함수
function exportToCSV(data, filename) {
    let csv = '\uFEFF' + data.headers.join(',') + '\n';
    data.rows.forEach(row => {
        csv += row.map(cell => `"${cell}"`).join(',') + '\n';
    });
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
}

// 티어 목록 생성
function getTierOptions() {
    const tiers = [];
    
    // Gold ~ Diamond (1-4)
    ['Gold', 'Platinum', 'Emerald', 'Diamond'].forEach(tier => {
        for (let i = 1; i <= 4; i++) {
            tiers.push(`${tier}${i}`);
        }
    });
    
    // Master, GrandMaster, Challenger
    tiers.push('Master', 'GrandMaster', 'Challenger');
    
    return tiers;
}
