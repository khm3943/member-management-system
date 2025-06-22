// utils/csvUtils.js
// CSV 관련 유틸리티 함수들

// CSV 내보내기 함수
function exportToCSV(data, filename) {
    // BOM 추가로 한글 깨짐 방지
    let csv = '\uFEFF' + data.headers.join(',') + '\n';
    
    data.rows.forEach(row => {
        // 각 셀을 따옴표로 감싸서 쉼표가 포함된 데이터 처리
        csv += row.map(cell => `"${cell}"`).join(',') + '\n';
    });
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    
    // 메모리 정리
    URL.revokeObjectURL(link.href);
}

// 회원 데이터를 CSV 형식으로 변환
function convertMembersToCSV(members) {
    const headers = ['이름', '닉네임', '생년', '티어', '주라인', '부라인', '비고'];
    
    const rows = members.map(member => [
        member.name || '',
        member.nickname || '',
        member.birthYear || '',
        member.tier || '',
        member.mainPosition || '없음',
        member.subPositions || '',
        member.note || ''
    ]);
    
    return { headers, rows };
}

// 팀 데이터를 CSV 형식으로 변환
function convertTeamsToCSV(teams, teamCount) {
    const headers = ['매치', '팀', '순서', '이름', '닉네임', '티어', '주라인', '부라인'];
    const rows = [];
    
    teams.forEach((team, teamIndex) => {
        const matchNumber = Math.floor(teamIndex / 2) + 1;
        const teamNumber = (teamIndex % 2) + 1;
        
        team.forEach((member, memberIndex) => {
            rows.push([
                matchNumber,
                teamNumber,
                memberIndex + 1,
                member.name || '',
                member.nickname || '',
                member.tier || '',
                member.mainPosition || '없음',
                member.subPositions || ''
            ]);
        });
    });
    
    return { headers, rows };
}
