// hooks/useTeamBuilder.js
// 팀 빌더 로직 관리 커스텀 훅
function useTeamBuilder(defaultTeamCount = 5) {
    const [selectedMembers, setSelectedMembers] = React.useState([]);
    const [teamCount, setTeamCount] = React.useState(defaultTeamCount); // ⭐ 기본 5팀
    const [teams, setTeams] = React.useState([]);
    const [stage, setStage] = React.useState('selectMembers'); // ⭐ 바로 멤버 선택으로 시작
    const [draggedMember, setDraggedMember] = React.useState(null);
    const [draggedFromTeam, setDraggedFromTeam] = React.useState(null);

    // 초기화 시 기본 팀 설정
    React.useEffect(() => {
        if (teamCount) {
            setTeams(Array(teamCount * 2).fill([]));
        }
    }, [teamCount]);

    // 팀 개수 변경
    const changeTeamCount = (count) => {
        setTeamCount(count);
        setTeams(Array(count * 2).fill([]));
        setSelectedMembers([]);
        setStage('selectMembers');
    };

    // 멤버 선택/해제
    const toggleMember = (member) => {
        const maxMembers = teamCount * 10;
        
        if (selectedMembers.find(m => m.id === member.id)) {
            setSelectedMembers(selectedMembers.filter(m => m.id !== member.id));
        } else {
            if (selectedMembers.length < maxMembers) {
                setSelectedMembers([...selectedMembers, member]);
            } else {
                return { success: false, error: `최대 ${maxMembers}명까지만 선택 가능합니다.` };
            }
        }
        return { success: true };
    };

    // 자동 밸런스 (개선된 버전)
    const autoBalance = () => {
        const requiredMembers = teamCount * 10;
        
        if (selectedMembers.length !== requiredMembers) {
            return { 
                success: false, 
                error: `정확히 ${requiredMembers}명을 선택해주세요. (현재: ${selectedMembers.length}명)` 
            };
        }

        try {
            // balanceTeams 함수 사용 (utils/teamBalancer.js에서)
            const balancedTeams = balanceTeams(selectedMembers, teamCount);
            
            if (balancedTeams) {
                setTeams(balancedTeams);
                return { success: true };
            } else {
                return { success: false, error: '팀 밸런스에 실패했습니다.' };
            }
        } catch (error) {
            console.error('자동 밸런스 실패:', error);
            return { success: false, error: '팀 밸런스 중 오류가 발생했습니다.' };
        }
    };

    // 드래그 앤 드롭 처리
    const handleDragStart = (member, teamIndex) => {
        setDraggedMember(member);
        setDraggedFromTeam(teamIndex);
    };

    const handleDrop = (toTeamIndex) => {
        if (draggedMember && draggedFromTeam !== null && draggedFromTeam !== toTeamIndex) {
            const newTeams = [...teams];
            
            // 원래 팀에서 제거
            newTeams[draggedFromTeam] = newTeams[draggedFromTeam].filter(
                m => m.id !== draggedMember.id
            );
            
            // 새 팀에 추가
            newTeams[toTeamIndex] = [...newTeams[toTeamIndex], draggedMember];
            
            setTeams(newTeams);
        }
        
        setDraggedMember(null);
        setDraggedFromTeam(null);
    };

    const clearDrag = () => {
        setDraggedMember(null);
        setDraggedFromTeam(null);
    };

    // 팀 통계 계산
    const getTeamStats = (team) => {
        if (team.length === 0) return { avgTier: 0, positions: {}, count: 0 };
        
        const avgTier = team.reduce((sum, m) => sum + getTierScore(m.tier), 0) / team.length;
        const positions = {};
        
        ['탑', '정글', '미드', '원딜', '서폿'].forEach(pos => {
            positions[pos] = team.filter(m => m.mainPosition === pos).length;
        });
        
        return { avgTier, positions, count: team.length };
    };

    // 매치별 밸런스 분석
    const getMatchBalanceStats = () => {
        const stats = [];
        
        for (let matchIdx = 0; matchIdx < teamCount; matchIdx++) {
            const team1 = teams[matchIdx * 2] || [];
            const team2 = teams[matchIdx * 2 + 1] || [];
            const team1Stats = getTeamStats(team1);
            const team2Stats = getTeamStats(team2);
            
            const tierDiff = Math.abs(team1Stats.avgTier - team2Stats.avgTier);
            
            // 포지션 밸런스 체크
            const positionBalance = ['탑', '정글', '미드', '원딜', '서폿'].every(pos => {
                const team1Count = team1Stats.positions[pos] || 0;
                const team2Count = team2Stats.positions[pos] || 0;
                return team1Count <= 1 && team2Count <= 1;
            });
            
            stats.push({
                matchIndex: matchIdx + 1,
                tierDiff,
                positionBalance,
                team1Stats,
                team2Stats,
                isBalanced: tierDiff <= 0.5 && positionBalance
            });
        }
        
        return stats;
    };

    // 전체 리셋
    const reset = () => {
        setSelectedMembers([]);
        setTeams(Array(teamCount * 2).fill([]));
        setStage('selectMembers');
        setDraggedMember(null);
        setDraggedFromTeam(null);
    };

    // 단계 변경
    const goToStage = (newStage) => {
        setStage(newStage);
    };

    return {
        // 상태
        selectedMembers,
        teamCount,
        teams,
        stage,
        draggedMember,
        draggedFromTeam,
        
        // 팀 관리
        changeTeamCount,
        toggleMember,
        autoBalance,
        reset,
        
        // 드래그 앤 드롭
        handleDragStart,
        handleDrop,
        clearDrag,
        
        // 통계 및 분석
        getTeamStats,
        getMatchBalanceStats,
        
        // 네비게이션
        goToStage,
        
        // 유틸리티
        requiredMembers: teamCount * 10,
        isComplete: selectedMembers.length === teamCount * 10,
        hasTeams: teams.some(t => t.length > 0)
    };
}
