// 팀 밸런싱 관련 함수들
function balanceTeams(selectedMembers, teamCount) {
    const requiredMembers = teamCount * 10;
    
    if (selectedMembers.length !== requiredMembers) {
        return null;
    }

    // 포지션별로 멤버 분류
    const membersByPosition = {
        '탑': [],
        '정글': [],
        '미드': [],
        '원딜': [],
        '서폿': [],
        '없음': []
    };

    selectedMembers.forEach(member => {
        const position = member.mainPosition || '없음';
        membersByPosition[position].push(member);
    });

    // 각 포지션별로 티어 순으로 정렬
    Object.keys(membersByPosition).forEach(pos => {
        membersByPosition[pos].sort((a, b) => getTierScore(b.tier) - getTierScore(a.tier));
    });

    // 팀 초기화 (각 팀 정확히 5명)
    const newTeams = Array(teamCount * 2).fill(null).map(() => []);
    
    // 각 팀에 할당된 멤버 수 추적
    const teamMemberCounts = Array(teamCount * 2).fill(0);
    
    // 1단계: 각 포지션을 팀에 균등 배분 (팀당 최대 5명 제한)
    const positions = ['탑', '정글', '미드', '원딜', '서폿'];
    
    positions.forEach(position => {
        const positionMembers = membersByPosition[position];
        
        positionMembers.forEach((member, index) => {
            // 아직 5명이 안 찬 팀 중에서 선택
            let targetTeamIndex = -1;
            let minCount = 6; // 최대값으로 시작
            
            // 가장 인원이 적은 팀 찾기
            for (let i = 0; i < teamCount * 2; i++) {
                if (teamMemberCounts[i] < 5 && teamMemberCounts[i] < minCount) {
                    // 같은 포지션이 이미 있는지 확인
                    const hasSamePosition = newTeams[i].some(m => m.mainPosition === position);
                    if (!hasSamePosition) {
                        minCount = teamMemberCounts[i];
                        targetTeamIndex = i;
                    }
                }
            }
            
            // 같은 포지션이 없는 팀이 없다면, 그냥 인원이 적은 팀 선택
            if (targetTeamIndex === -1) {
                for (let i = 0; i < teamCount * 2; i++) {
                    if (teamMemberCounts[i] < 5) {
                        targetTeamIndex = i;
                        break;
                    }
                }
            }
            
            if (targetTeamIndex !== -1) {
                newTeams[targetTeamIndex].push(member);
                teamMemberCounts[targetTeamIndex]++;
            }
        });
    });

    // 2단계: 포지션이 없는 멤버들을 5명이 안 찬 팀에 배분
    const noPositionMembers = membersByPosition['없음'];
    
    noPositionMembers.forEach(member => {
        // 5명이 안 찬 팀 찾기
        for (let i = 0; i < teamCount * 2; i++) {
            if (teamMemberCounts[i] < 5) {
                newTeams[i].push(member);
                teamMemberCounts[i]++;
                break;
            }
        }
    });

    // 3단계: 매치별로 팀 간 티어 밸런스 조정 (각 팀 5명 유지)
    for (let matchIdx = 0; matchIdx < teamCount; matchIdx++) {
        const team1Idx = matchIdx * 2;
        const team2Idx = matchIdx * 2 + 1;
        const team1 = newTeams[team1Idx];
        const team2 = newTeams[team2Idx];
        
        // 티어 점수 차이가 큰 경우 멤버 스왑으로 밸런스 조정
        const team1AvgTier = team1.reduce((sum, m) => sum + getTierScore(m.tier), 0) / 5;
        const team2AvgTier = team2.reduce((sum, m) => sum + getTierScore(m.tier), 0) / 5;
        
        if (Math.abs(team1AvgTier - team2AvgTier) > 1.0) {
            // 더 강한 팀에서 가장 강한 멤버와 더 약한 팀에서 가장 약한 멤버 스왑 고려
            const strongerTeam = team1AvgTier > team2AvgTier ? team1 : team2;
            const weakerTeam = team1AvgTier > team2AvgTier ? team2 : team1;
            
            // 포지션이 겹치지 않는 선에서 스왑
            for (let i = 0; i < strongerTeam.length; i++) {
                for (let j = 0; j < weakerTeam.length; j++) {
                    const member1 = strongerTeam[i];
                    const member2 = weakerTeam[j];
                    
                    // 스왑 후 같은 포지션이 2개 이상 되지 않는지 확인
                    const wouldCreateDuplicate = 
                        strongerTeam.filter(m => m !== member1 && m.mainPosition === member2.mainPosition).length > 0 ||
                        weakerTeam.filter(m => m !== member2 && m.mainPosition === member1.mainPosition).length > 0;
                    
                    if (!wouldCreateDuplicate && getTierScore(member1.tier) > getTierScore(member2.tier)) {
                        // 스왑
                        strongerTeam[i] = member2;
                        weakerTeam[j] = member1;
                        break;
                    }
                }
            }
        }
    }

    return newTeams;
}

// 팀 통계 계산
function getTeamStats(team) {
    if (team.length === 0) return { avgTier: 0, positions: {}, count: 0 };
    
    const avgTier = team.reduce((sum, m) => sum + getTierScore(m.tier), 0) / team.length;
    const positions = {};
    
    ['탑', '정글', '미드', '원딜', '서폿'].forEach(pos => {
        positions[pos] = team.filter(m => m.mainPosition === pos).length;
    });
    
    return { avgTier, positions, count: team.length };
}
