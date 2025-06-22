// 팀 짜기 페이지 컴포넌트
function TeamBuilder() {
    const [members, setMembers] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedMembers, setSelectedMembers] = useState([]);
    const [teamCount, setTeamCount] = useState(null);
    const [teams, setTeams] = useState([]);
    const [stage, setStage] = useState('selectCount');
    const [draggedMember, setDraggedMember] = useState(null);
    const [draggedFromTeam, setDraggedFromTeam] = useState(null);

    useEffect(() => {
        return db.collection('lol_members').orderBy('tier', 'desc')
            .onSnapshot(snap => {
                setMembers(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            });
    }, []);

    // 검색된 멤버 필터링
    const filteredMembers = members.filter(m => 
        m.nickname.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.name.includes(searchTerm)
    );

    // 팀 개수 선택
    const selectTeamCount = (count) => {
        setTeamCount(count);
        setStage('selectMembers');
        setTeams(Array(count * 2).fill([]));
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
                alert(`최대 ${maxMembers}명까지만 선택 가능합니다.`);
            }
        }
    };

    // 개선된 자동 밸런스 (포지션 + 티어 고려)
    const autoBalance = () => {
        const requiredMembers = teamCount * 10;
        if (selectedMembers.length !== requiredMembers) {
            alert(`정확히 ${requiredMembers}명을 선택해주세요. (현재: ${selectedMembers.length}명)`);
            return;
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

        // 팀 초기화
        const newTeams = Array(teamCount * 2).fill(null).map(() => []);
        
        // 포지션별로 순환하면서 팀에 배분
        const positions = ['탑', '정글', '미드', '원딜', '서폿'];
        
        // 1단계: 각 포지션을 팀에 균등 배분
        positions.forEach(position => {
            const positionMembers = membersByPosition[position];
            positionMembers.forEach((member, index) => {
                // 지그재그로 배분하여 티어 밸런스 맞추기
                const teamIndex = index % (teamCount * 2);
                newTeams[teamIndex].push(member);
            });
        });

        // 2단계: 포지션이 없는 멤버들 배분
        const noPositionMembers = membersByPosition['없음'];
        
        // 각 팀의 현재 인원수와 평균 티어 계산
        const teamStats = newTeams.map((team, index) => ({
            index,
            count: team.length,
            avgTier: team.length > 0 
                ? team.reduce((sum, m) => sum + getTierScore(m.tier), 0) / team.length 
                : 0
        }));

        // 포지션 없는 멤버들을 인원수가 적고 티어가 낮은 팀부터 배치
        noPositionMembers.forEach(member => {
            // 인원수가 가장 적은 팀들 찾기
            const minCount = Math.min(...teamStats.map(t => t.count));
            const teamsWithMinCount = teamStats.filter(t => t.count === minCount);
            
            // 그 중에서 평균 티어가 가장 낮은 팀 선택
            const targetTeam = teamsWithMinCount.reduce((min, team) => 
                team.avgTier < min.avgTier ? team : min
            );
            
            // 멤버 추가
            newTeams[targetTeam.index].push(member);
            
            // 통계 업데이트
            targetTeam.count++;
            const currentSum = targetTeam.avgTier * (targetTeam.count - 1);
            targetTeam.avgTier = (currentSum + getTierScore(member.tier)) / targetTeam.count;
        });

        // 3단계: 최종 밸런스 조정 (포지션 중복 고려)
        // 각 팀의 포지션 분포 확인 및 조정
        for (let matchIdx = 0; matchIdx < teamCount; matchIdx++) {
            const team1Idx = matchIdx * 2;
            const team2Idx = matchIdx * 2 + 1;
            const team1 = newTeams[team1Idx];
            const team2 = newTeams[team2Idx];
            
            // 포지션 카운트
            const getPositionCount = (team) => {
                const count = {};
                positions.forEach(pos => count[pos] = 0);
                team.forEach(member => {
                    if (positions.includes(member.mainPosition)) {
                        count[member.mainPosition]++;
                    }
                });
                return count;
            };
            
            const team1Positions = getPositionCount(team1);
            const team2Positions = getPositionCount(team2);
            
            // 포지션이 2명 이상인 경우 다른 팀으로 이동 고려
            positions.forEach(pos => {
                while (team1Positions[pos] > 1 && team2Positions[pos] === 0) {
                    // team1에서 해당 포지션 멤버 중 하나를 team2로 이동
                    const memberToMove = team1.find(m => m.mainPosition === pos);
                    if (memberToMove) {
                        team1.splice(team1.indexOf(memberToMove), 1);
                        team2.push(memberToMove);
                        team1Positions[pos]--;
                        team2Positions[pos]++;
                    }
                }
                
                while (team2Positions[pos] > 1 && team1Positions[pos] === 0) {
                    // team2에서 해당 포지션 멤버 중 하나를 team1로 이동
                    const memberToMove = team2.find(m => m.mainPosition === pos);
                    if (memberToMove) {
                        team2.splice(team2.indexOf(memberToMove), 1);
                        team1.push(memberToMove);
                        team2Positions[pos]--;
                        team1Positions[pos]++;
                    }
                }
            });
        }

        setTeams(newTeams);
    };

    // 드래그 시작
    const handleDragStart = (e, member, teamIndex) => {
        setDraggedMember(member);
        setDraggedFromTeam(teamIndex);
        e.dataTransfer.effectAllowed = 'move';
    };

    // 드래그 오버
    const handleDragOver = (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    // 드롭
    const handleDrop = (e, toTeamIndex) => {
        e.preventDefault();
        
        if (draggedMember && draggedFromTeam !== null && draggedFromTeam !== toTeamIndex) {
            const newTeams = [...teams];
            
            newTeams[draggedFromTeam] = newTeams[draggedFromTeam].filter(
                m => m.id !== draggedMember.id
            );
            
            newTeams[toTeamIndex] = [...newTeams[toTeamIndex], draggedMember];
            
            setTeams(newTeams);
        }
        
        setDraggedMember(null);
        setDraggedFromTeam(null);
    };

    // 팀 통계 계산
    const getTeamStats = (team) => {
        if (team.length === 0) return { avgTier: 0, positions: {} };
        
        const avgTier = team.reduce((sum, m) => sum + getTierScore(m.tier), 0) / team.length;
        const positions = {};
        
        ['탑', '정글', '미드', '원딜', '서폿'].forEach(pos => {
            positions[pos] = team.filter(m => m.mainPosition === pos).length;
        });
        
        return { avgTier, positions };
    };

    // 초기화
    const reset = () => {
        setSelectedMembers([]);
        setTeams([]);
        setTeamCount(null);
        setStage('selectCount');
        setSearchTerm('');
    };

    // 팀 개수 선택 화면
    if (stage === 'selectCount') {
        return (
            <div className="p-6">
                <div className="max-w-2xl mx-auto">
                    <div className="bg-white rounded-lg shadow p-8 text-center">
                        <h1 className="text-3xl font-bold mb-6">팀 짜기</h1>
                        <p className="text-xl mb-8">몇 팀을 짜실건가요?</p>
                        <div className="grid grid-cols-5 gap-4">
                            {[1, 2, 3, 4, 5].map(num => (
                                <button
                                    key={num}
                                    onClick={() => selectTeamCount(num)}
                                    className="btn btn-blue text-2xl py-8 hover:scale-105 transition"
                                >
                                    {num}
                                </button>
                            ))}
                        </div>
                        <p className="text-gray-600 mt-6">
                            {[1, 2, 3, 4, 5].map(num => (
                                <span key={num} className="block">
                                    {num}팀 = {num * 10}명 필요 ({num}개의 5대5)
                                </span>
                            ))}
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    // 멤버 선택 화면
    return (
        <div className="p-6">
            <div className="bg-white rounded-lg shadow p-4 mb-4">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-bold">{teamCount}팀 짜기</h1>
                        <p className="text-gray-600">
                            {teamCount * 10}명을 선택하세요 (현재: {selectedMembers.length}명)
                            {teams.some(t => t.length > 0) && " - 드래그로 팀원 이동 가능"}
                        </p>
                    </div>
                    <button onClick={reset} className="btn btn-gray">
                        처음으로
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                {/* 회원 검색 및 선택 영역 */}
                <div className="lg:col-span-1">
                    <div className="bg-white rounded-lg shadow p-4">
                        <h2 className="font-bold mb-3">회원 검색</h2>
                        <input
                            type="text"
                            placeholder="닉네임 또는 이름 검색..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full mb-3"
                        />
                        <div className="space-y-2 max-h-96 overflow-y-auto">
                            {filteredMembers.map(member => {
                                const isSelected = selectedMembers.find(m => m.id === member.id);
                                return (
                                    <div
                                        key={member.id}
                                        onClick={() => toggleMember(member)}
                                        className={`p-2 rounded cursor-pointer transition ${
                                            isSelected
                                                ? 'bg-blue-100 border-blue-500 border'
                                                : 'hover:bg-gray-100 border border-gray-200'
                                        }`}
                                    >
                                        <div className="flex justify-between items-center">
                                            <div>
                                                <div className="font-medium">{member.name}</div>
                                                <div className="text-xs text-gray-600">{member.nickname}</div>
                                            </div>
                                            <span className={`tier text-xs ${getTierClass(member.tier)}`}>
                                                {member.tier || 'Unranked'}
                                            </span>
                                        </div>
                                        <div className="text-xs text-gray-600">
                                            {member.mainPosition}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        <button
                            onClick={autoBalance}
                            className="w-full mt-4 btn btn-blue"
                            disabled={selectedMembers.length !== teamCount * 10}
                        >
                            자동 밸런스 (포지션 고려)
                        </button>
                    </div>
                </div>

                {/* 팀 표시 영역 */}
                <div className="lg:col-span-3">
                    <div className="grid grid-cols-2 gap-4">
                        {teams.map((team, index) => {
                            const matchNumber = Math.floor(index / 2) + 1;
                            const teamNumber = (index % 2) + 1;
                            const teamColor = teamNumber === 1 ? 'blue' : 'red';
                            const stats = getTeamStats(team);
                            
                            return (
                                <div 
                                    key={index} 
                                    className={`bg-white rounded-lg shadow p-4 ${
                                        draggedFromTeam !== null && draggedFromTeam !== index 
                                            ? 'ring-2 ring-green-400' 
                                            : ''
                                    }`}
                                    onDragOver={handleDragOver}
                                    onDrop={(e) => handleDrop(e, index)}
                                >
                                    <h2 className={`font-bold mb-3 text-${teamColor}-600`}>
                                        매치 {matchNumber} - 팀 {teamNumber}
                                    </h2>
                                    
                                    {/* 포지션 분포 표시 */}
                                    {team.length > 0 && (
                                        <div className="mb-3 text-xs flex gap-2 flex-wrap">
                                            {Object.entries(stats.positions).map(([pos, count]) => (
                                                <span 
                                                    key={pos} 
                                                    className={`px-2 py-1 rounded ${
                                                        count === 0 ? 'bg-gray-200 text-gray-500' : 
                                                        count === 1 ? 'bg-green-100 text-green-700' : 
                                                        'bg-yellow-100 text-yellow-700'
                                                    }`}
                                                >
                                                    {pos}: {count}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                    
                                    <div className="space-y-2 min-h-[200px]">
                                        {team.map((member, idx) => (
                                            <div 
                                                key={member.id} 
                                                className={`p-2 bg-${teamColor}-50 rounded cursor-move hover:shadow-md transition`}
                                                draggable
                                                onDragStart={(e) => handleDragStart(e, member, index)}
                                            >
                                                <div className="flex justify-between">
                                                    <span>
                                                        {idx + 1}. {member.name}
                                                        <span className="text-xs text-gray-600 ml-2">
                                                            ({member.nickname})
                                                        </span>
                                                    </span>
                                                    <span className={`tier text-xs ${getTierClass(member.tier)}`}>
                                                        {member.tier}
                                                    </span>
                                                </div>
                                                <div className="text-xs text-gray-600">
                                                    {member.mainPosition}
                                                    {member.subPositions && ` (부: ${member.subPositions})`}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    {team.length > 0 && (
                                        <div className="mt-3 pt-3 border-t text-sm text-gray-600">
                                            <div>인원: {team.length}명</div>
                                            <div>평균 티어 점수: {stats.avgTier.toFixed(1)}</div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {/* 팀 밸런스 요약 */}
                    {teams.some(t => t.length > 0) && (
                        <div className="mt-4 bg-gray-100 rounded-lg p-4">
                            <h3 className="font-bold mb-2">팀 밸런스 요약</h3>
                            <div className="space-y-2">
                                {Array.from({ length: teamCount }).map((_, matchIdx) => {
                                    const team1 = teams[matchIdx * 2] || [];
                                    const team2 = teams[matchIdx * 2 + 1] || [];
                                    const team1Stats = getTeamStats(team1);
                                    const team2Stats = getTeamStats(team2);
                                    const tierDiff = Math.abs(team1Stats.avgTier - team2Stats.avgTier);
                                    
                                    // 포지션 밸런스 체크
                                    const positionBalance = ['탑', '정글', '미드', '원딜', '서폿'].map(pos => ({
                                        pos,
                                        team1: team1Stats.positions[pos] || 0,
                                        team2: team2Stats.positions[pos] || 0
                                    }));
                                    
                                    return (
                                        <div key={matchIdx} className="border rounded p-3 bg-white">
                                            <div className="font-medium mb-1">매치 {matchIdx + 1}</div>
                                            <div className="text-sm grid grid-cols-2 gap-2">
                                                <div>
                                                    <span className="font-medium">티어 차이:</span>
                                                    <span className={`ml-2 ${tierDiff > 0.5 ? 'text-red-600' : 'text-green-600'}`}>
                                                        {tierDiff.toFixed(2)}점
                                                    </span>
                                                </div>
                                                <div>
                                                    <span className="font-medium">포지션:</span>
                                                    {positionBalance.every(p => p.team1 <= 1 && p.team2 <= 1) ? (
                                                        <span className="ml-2 text-green-600">균형</span>
                                                    ) : (
                                                        <span className="ml-2 text-yellow-600">불균형</span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* 선택된 멤버 요약 */}
                    {selectedMembers.length > 0 && teams.every(t => t.length === 0) && (
                        <div className="mt-4 bg-gray-100 rounded-lg p-4">
                            <h3 className="font-bold mb-2">선택된 멤버 ({selectedMembers.length}명)</h3>
                            <div className="flex flex-wrap gap-2">
                                {selectedMembers.map(member => (
                                    <span
                                        key={member.id}
                                        className="px-2 py-1 bg-white rounded text-sm cursor-pointer hover:bg-red-100"
                                        onClick={() => toggleMember(member)}
                                    >
                                        {member.name} ({member.mainPosition}) ✕
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
