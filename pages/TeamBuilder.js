// 팀 짜기 페이지 컴포넌트 (개선된 밸런싱)
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
        if (selectedMembers.find(m => m.id === member.id)) {
            setSelectedMembers(selectedMembers.filter(m => m.id !== member.id));
        } else {
            setSelectedMembers([...selectedMembers, member]);
        }
    };

    // ⭐ 개선된 자동 밸런스 (각 팀 5명씩 + 매치별 밸런스)
    const autoBalance = () => {
        // ⭐ 선택된 인원수에 따라 팀 수 자동 계산
        const totalMembers = selectedMembers.length;
        if (totalMembers === 0) {
            alert('멤버를 선택해주세요.');
            return;
        }

        if (totalMembers % 10 !== 0) {
            alert(`10명 단위로 선택해주세요. (현재: ${totalMembers}명)\n10명=2팀, 20명=4팀, 30명=6팀...`);
            return;
        }

        const calculatedTeamCount = totalMembers / 10; // 매치 수
        const totalTeams = calculatedTeamCount * 2; // 총 팀 수

        // 포지션별로 멤버 분류 및 티어 순 정렬
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

        // 각 포지션별로 티어 순으로 정렬 (높은 티어부터)
        Object.keys(membersByPosition).forEach(pos => {
            membersByPosition[pos].sort((a, b) => getTierScore(b.tier) - getTierScore(a.tier));
        });

        // ⭐ 1단계: 각 팀에 포지션별로 1명씩 배치
        const newTeams = Array(totalTeams).fill(null).map(() => []);
        const positions = ['탑', '정글', '미드', '원딜', '서폿'];
        const usedMembers = new Set();

        // 각 팀마다 포지션 순서대로 배치
        for (let teamIdx = 0; teamIdx < totalTeams; teamIdx++) {
            for (let posIdx = 0; posIdx < 5; posIdx++) { // 각 팀에 5명씩
                let assigned = false;
                
                // 포지션 순서대로 시도
                for (let i = 0; i < positions.length && !assigned; i++) {
                    const position = positions[(posIdx + i) % positions.length];
                    const availableMembers = membersByPosition[position].filter(m => !usedMembers.has(m.id));
                    
                    if (availableMembers.length > 0) {
                        // 티어 밸런스를 위해 팀 순서대로 배치
                        const memberToAssign = availableMembers[Math.floor(teamIdx / 2) % availableMembers.length] || availableMembers[0];
                        newTeams[teamIdx].push(memberToAssign);
                        usedMembers.add(memberToAssign.id);
                        
                        // 배치된 멤버를 해당 포지션 배열에서 제거
                        const memberIndex = membersByPosition[position].findIndex(m => m.id === memberToAssign.id);
                        if (memberIndex !== -1) {
                            membersByPosition[position].splice(memberIndex, 1);
                        }
                        assigned = true;
                    }
                }

                // 특정 포지션이 부족한 경우 '없음' 포지션에서 배치
                if (!assigned) {
                    const availableMembers = membersByPosition['없음'].filter(m => !usedMembers.has(m.id));
                    if (availableMembers.length > 0) {
                        const memberToAssign = availableMembers[0];
                        newTeams[teamIdx].push(memberToAssign);
                        usedMembers.add(memberToAssign.id);
                        
                        const memberIndex = membersByPosition['없음'].findIndex(m => m.id === memberToAssign.id);
                        if (memberIndex !== -1) {
                            membersByPosition['없음'].splice(memberIndex, 1);
                        }
                        assigned = true;
                    }
                }

                // 그래도 부족한 경우 다른 포지션에서 가져오기
                if (!assigned) {
                    for (const pos of positions) {
                        const availableMembers = membersByPosition[pos].filter(m => !usedMembers.has(m.id));
                        if (availableMembers.length > 0) {
                            const memberToAssign = availableMembers[0];
                            newTeams[teamIdx].push(memberToAssign);
                            usedMembers.add(memberToAssign.id);
                            
                            const memberIndex = membersByPosition[pos].findIndex(m => m.id === memberToAssign.id);
                            if (memberIndex !== -1) {
                                membersByPosition[pos].splice(memberIndex, 1);
                            }
                            break;
                        }
                    }
                }
            }
        }

        // ⭐ 2단계: 매치별 티어 밸런스 조정
        for (let matchIdx = 0; matchIdx < calculatedTeamCount; matchIdx++) {
            const team1Idx = matchIdx * 2;
            const team2Idx = matchIdx * 2 + 1;
            const team1 = newTeams[team1Idx];
            const team2 = newTeams[team2Idx];

            // 각 팀의 평균 티어 계산
            const team1AvgTier = team1.reduce((sum, m) => sum + getTierScore(m.tier), 0) / team1.length;
            const team2AvgTier = team2.reduce((sum, m) => sum + getTierScore(m.tier), 0) / team2.length;
            
            // 티어 차이가 큰 경우 멤버 교환으로 밸런스 조정
            if (Math.abs(team1AvgTier - team2AvgTier) > 1.0) {
                const strongerTeam = team1AvgTier > team2AvgTier ? team1 : team2;
                const weakerTeam = team1AvgTier > team2AvgTier ? team2 : team1;
                
                // 같은 포지션끼리 교환 시도
                for (let i = 0; i < strongerTeam.length && Math.abs(
                    strongerTeam.reduce((sum, m) => sum + getTierScore(m.tier), 0) / strongerTeam.length -
                    weakerTeam.reduce((sum, m) => sum + getTierScore(m.tier), 0) / weakerTeam.length
                ) > 0.5; i++) {
                    for (let j = 0; j < weakerTeam.length; j++) {
                        const strongMember = strongerTeam[i];
                        const weakMember = weakerTeam[j];
                        
                        // 같은 포지션이거나 포지션이 '없음'인 경우 교환
                        if (strongMember.mainPosition === weakMember.mainPosition || 
                            strongMember.mainPosition === '없음' || 
                            weakMember.mainPosition === '없음') {
                            
                            // 교환 후 밸런스가 개선되는지 확인
                            const newStrongerAvg = (strongerTeam.reduce((sum, m) => sum + getTierScore(m.tier), 0) - getTierScore(strongMember.tier) + getTierScore(weakMember.tier)) / strongerTeam.length;
                            const newWeakerAvg = (weakerTeam.reduce((sum, m) => sum + getTierScore(m.tier), 0) - getTierScore(weakMember.tier) + getTierScore(strongMember.tier)) / weakerTeam.length;
                            
                            if (Math.abs(newStrongerAvg - newWeakerAvg) < Math.abs(team1AvgTier - team2AvgTier)) {
                                // 교환 실행
                                strongerTeam[i] = weakMember;
                                weakerTeam[j] = strongMember;
                                break;
                            }
                        }
                    }
                }
            }
        }

        setTeams(newTeams);
        setTeamCount(calculatedTeamCount);
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
                        <p className="text-xl mb-4">몇 팀을 짜실건가요?</p>
                        <p className="text-green-600 font-bold mb-8">
                            ⭐ 각 팀마다 5명씩 자동 배치됩니다
                        </p>
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
                        <div className="text-gray-600 mt-6 space-y-1">
                            {[1, 2, 3, 4, 5].map(num => (
                                <div key={num}>
                                    {num}팀 = {num * 10}명 필요 ({num}개의 5대5)
                                </div>
                            ))}
                        </div>
                        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                            <p className="text-sm text-blue-700">
                                💡 <strong>자동 밸런싱:</strong> 멤버 선택 후 "자동 밸런스" 클릭하면<br/>
                                선택한 인원수에 맞춰 팀이 자동 생성됩니다 (10명=2팀, 20명=4팀...)
                            </p>
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
                        <h1 className="text-2xl font-bold">팀 짜기</h1>
                        <p className="text-gray-600">
                            멤버를 선택하세요 (현재: {selectedMembers.length}명)
                            <span className="text-green-600 font-bold"> ⭐ 10명 단위로 선택 (10명=2팀, 20명=4팀...)</span>
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
                            disabled={selectedMembers.length === 0 || selectedMembers.length % 10 !== 0}
                        >
                            ⚡ 자동 밸런스 (각 팀 5명씩)
                        </button>
                        {selectedMembers.length > 0 && selectedMembers.length % 10 !== 0 && (
                            <p className="text-red-600 text-sm mt-2">
                                10명 단위로 선택해주세요 (현재: {selectedMembers.length}명)
                            </p>
                        )}
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
                                        매치 {matchNumber} - 팀 {teamNumber} ({team.length}/5명)
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
                                    
                                    <div className="space-y-2 min-h-[250px]">
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

                    {/* 매치별 밸런스 요약 */}
                    {teams.some(t => t.length > 0) && teamCount && (
                        <div className="mt-4 bg-gray-100 rounded-lg p-4">
                            <h3 className="font-bold mb-2">매치별 팀 밸런스</h3>
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
                                            <div className="font-medium mb-1">🎮 매치 {matchIdx + 1}</div>
                                            <div className="text-sm grid grid-cols-2 gap-4">
                                                <div>
                                                    <span className="text-blue-600 font-medium">팀1:</span> {team1.length}명 (평균: {team1Stats.avgTier.toFixed(1)})
                                                </div>
                                                <div>
                                                    <span className="text-red-600 font-medium">팀2:</span> {team2.length}명 (평균: {team2Stats.avgTier.toFixed(1)})
                                                </div>
                                            </div>
                                            <div className="text-sm mt-1">
                                                <span className="font-medium">티어 차이:</span>
                                                <span className={`ml-2 ${tierDiff > 0.5 ? 'text-red-600' : 'text-green-600'}`}>
                                                    {tierDiff.toFixed(2)}점 {tierDiff <= 0.5 ? '✅' : '⚠️'}
                                                </span>
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
