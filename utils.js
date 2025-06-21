// 티어 클래스 가져오기
function getTierClass(tierName) {
    const tier = TIERS.find(t => 
        t.name.toLowerCase() === tierName?.toLowerCase() ||
        t.ko === tierName
    );
    return tier ? tier.class : 'tier-unranked';
}

// 티어 점수 계산
function getTierScore(tier) {
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
    const tierName = tier?.toLowerCase().match(/[a-z]+/)?.[0] || 'unranked';
    return tierScores[tierName] || 1;
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
