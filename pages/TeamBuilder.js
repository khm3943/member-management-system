// 팀 짜기 페이지 컴포넌트 (팀당 5명 기본 구성)
function TeamBuilder() {
    const [members, setMembers] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedMembers, setSelectedMembers] = useState([]);
    const [teamCount, setTeamCount] = useState(null);
    const [teams, setTeams] = useState([]);
    const [waitingMembers, setWaitingMembers] = useState([]); // ⭐ 대기 멤버들
    const [stage, setStage] = useState('selectCount');
    const [draggedMember, setDraggedMember] = useState(null);
    const [draggedFromTeam, setDraggedFromTeam] = useState(null);
    const [draggedFromWaiting, setDraggedFromWaiting] = useState(false); // ⭐ 대기에서 드래그

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
        setWaitingMembers([]); // ⭐ 대기 멤버 초기화
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

    // ⭐ 개선된 자동 밸런스 (팀당 5명씩 먼저 구성)
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

        // ⭐ 팀 초기화 (팀당 정확히 5명씩)
        const newTeams = Array(teamCount * 2).fill(null).map(() => []);
        const usedMembers = new Set();
        
        // ⭐ 1단계: 각 팀에 5명씩 먼저 배치
        const positions = ['탑', '정글', '미드', '원딜', '서폿'];
        
        // 각 팀마다 포지션별로 1명씩 배치
        for (let teamIdx = 0; teamIdx < teamCount * 2; teamIdx++) {
            for (let posIdx = 0; posIdx < positions.length; posIdx++) {
                const position = positions[posIdx];
                const availableMembers = membersByPosition[position].filter(m => !usedMembers.has(m.id));
                
                if (availableMembers.length > 0) {
                    // 티어 밸런스를 위해 순환 배치
                    const memberToAssign = availableMembers[Math.floor(teamIdx / 2) % availableMembers.length] || availableMembers[0];
                    newTeams[teamIdx].push(memberToAssign);
                    usedMembers.add(memberToAssign.id);
                    
                    // 배치된 멤버를 해당 포지션 배열에서 제거
                    const memberIndex = membersByPosition[position].findIndex(m => m.id === memberToAssign.id);
                    if (memberIndex !== -1) {
                        membersByPosition[position].splice(memberIndex, 1);
                    }
                }
            }
        }

        // ⭐ 2단계: 나머지 멤버들은 대기 영역에 배치
        const remainingMembers = selectedMembers.filter(member => !usedMembers.has(member.id));
        
        setTeams(newTeams);
        setWaitingMembers(remainingMembers); // ⭐ 대기 멤버 설정
    };

    // ⭐ 드래그 시작 (팀에서 또는 대기에서)
    const handleDragStart = (e, member, teamIndex = null) => {
        setDraggedMember(member);
        setDraggedFromTeam(teamIndex);
        setDraggedFromWaiting(teamIndex === null); // 대기에서 드래그하는 경우
        e.dataTransfer.effectAllowed = 'move';
    };

    // 드래그 오버
    const handleDragOver = (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    // ⭐ 팀에 드롭
    const handleDropOnTeam = (e, toTeamIndex) => {
        e.preventDefault();
        
        if (!draggedMember) return;

        const newTeams = [...teams];
        const newWaitingMembers = [...waitingMembers];

        // 대기에서 팀으로 이동
        if (draggedFromWaiting) {
            newTeams[toTeamIndex] = [...newTeams[toTeamIndex], draggedMember];
            const waitingIndex = newWaitingMembers.findIndex(m => m.id === draggedMember.id);
            if (waitingIndex !== -1) {
                newWaitingMembers.splice(waitingIndex, 1);
            }
        }
        // 팀에서 다른 팀으로 이동
        else if (draggedFromTeam !== null && draggedFromTeam !== toTeamIndex) {
            newTeams[draggedFromTeam] = newTeams[draggedFromTeam].filter(
                m => m.id !== draggedMember.id
            );
            newTeams[toTeamIndex] = [...newTeams[toTeamIndex], draggedMember];
        }

        setTeams(newTeams);
        setWaitingMembers(newWaitingMembers);
        clearDragState();
    };

    // ⭐ 대기 영역에 드롭
    const handleDropOnWaiting = (e) => {
        e.preventDefault();
        
        if (!draggedMember || draggedFromWaiting) return; // 대기에서 대기로는 이동 불가

        const newTeams = [...teams];
        const newWaitingMembers = [...waitingMembers];

        // 팀에서 대기로 이동
        if (draggedFromTeam !== null) {
            newTeams[draggedFromTeam] = newTeams[draggedFromTeam].filter(
                m => m.id !== draggedMember.id
            );
            newWaitingMembers.push(draggedMember);
        }

        setTeams(newTeams);
        setWaitingMembers(newWaitingMembers);
        clearDragState();
    };

    // 드래그 상태 초기화
    const clearDragState = () => {
        setDraggedMember(null);
        setDraggedFromTeam(null);
        setDraggedFromWaiting(false);
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
        setWaitingMembers([]); // ⭐ 대기 멤버 초기화
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
                        <div className="text-gray-600 mt-6">
                            {[1, 2, 3, 4, 5].map(num => (
                                <div key={num}>
                                    {num}팀 = {num * 10}명 필요 ({num}개의 5대5) 
                                    <span className="text-green-600 font-bold"> ⭐ 팀당 5명씩 먼저 구성</span>
                                </div>
                            ))}
                        </div>
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
                            <span className="text-green-600 font-bold"> ⭐ 팀당 5명씩 먼저 배치됩니다</span>
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
                            ⭐ 팀당 5명씩 구성 + 나머지 대기
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
                                        draggedFromWaiting || (draggedFromTeam !== null && draggedFromTeam !== index)
                                            ? 'ring-2 ring-green-400' 
                                            : ''
                                    }`}
                                    onDragOver={handleDragOver}
                                    onDrop={(e) => handleDropOnTeam(e, index)}
                                >
                                    <h2 className={`font-bold mb-3 text-${teamColor}-600`}>
                                        매치 {matchNumber} - 팀 {teamNumber} ({team.length}명)
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
                                        
                                        {/* ⭐ 팀이 5명 미만일 때 빈 슬롯 표시 */}
                                        {team.length < 5 && Array.from({ length: 5 - team.length }).map((_, emptyIdx) => (
                                            <div key={`empty-${emptyIdx}`} className="p-2 border-2 border-dashed border-gray-300 rounded text-center text-gray-400">
                                                빈 자리
                                            </div>
                                        ))}
                                    </div>
                                    
                                    {team.length > 0 && (
                                        <div className="mt-3 pt-3 border-t text-sm text-gray-600">
                                            <div>인원: {team.length}명 / 5명</div>
                                            <div>평균 티어 점수: {stats.avgTier.toFixed(1)}</div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {/* ⭐ 대기 멤버 영역 */}
                    {waitingMembers.length > 0 && (
                        <div className="mt-4 bg-yellow-50 rounded-lg shadow p-4">
                            <h3 className="font-bold mb-3 text-yellow-700">
                                ⏳ 대기 멤버 ({waitingMembers.length}명)
                            </h3>
                            <p className="text-sm text-yellow-600 mb-3">
                                아래 멤버들을 팀으로 드래그해서 추가하거나 기존 멤버와 교체하세요
                            </p>
                            <div 
                                className={`grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 min-h-[100px] p-3 border-2 border-dashed border-yellow-300 rounded ${
                                    draggedFromTeam !== null ? 'ring-2 ring-yellow-400 bg-yellow-100' : ''
                                }`}
                                onDragOver={handleDragOver}
                                onDrop={handleDropOnWaiting}
                            >
                                {waitingMembers.map((member) => (
                                    <div 
                                        key={member.id} 
                                        className="p-2 bg-white rounded cursor-move hover:shadow-md transition border"
                                        draggable
                                        onDragStart={(e) => handleDragStart(e, member, null)}
                                    >
                                        <div className="text-sm font-medium">{member.name}</div>
                                        <div className="text-xs text-gray-600">{member.nickname}</div>
                                        <div className="text-xs">{member.mainPosition}</div>
                                        <span className={`tier text-xs ${getTierClass(member.tier)}`}>
                                            {member.tier}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

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
                                    const tierDiff = team1.length > 0 && team2.length > 0 ? 
                                        Math.abs(team1Stats.avgTier - team2Stats.avgTier) : 0;
                                    
                                    return (
                                        <div key={matchIdx} className="border rounded p-3 bg-white">
                                            <div className="font-medium mb-1">매치 {matchIdx + 1}</div>
                                            <div className="text-sm grid grid-cols-3 gap-2">
                                                <div>팀1: {team1.length}명</div>
                                                <div>팀2: {team2.length}명</div>
                                                <div>
                                                    <span className="font-medium">티어 차이:</span>
                                                    <span className={`ml-2 ${tierDiff > 0.5 ? 'text-red-600' : 'text-green-600'}`}>
                                                        {tierDiff.toFixed(2)}점
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* 선택된 멤버 요약 */}
                    {selectedMembers.length > 0 && teams.every(t => t.length === 0) && waitingMembers.length === 0 && (
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
