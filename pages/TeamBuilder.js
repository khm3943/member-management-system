// 팀 짜기 페이지 컴포넌트
function TeamBuilder() {
    const [members, setMembers] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedMembers, setSelectedMembers] = useState([]);
    const [teamCount, setTeamCount] = useState(null);
    const [teams, setTeams] = useState([]);
    const [stage, setStage] = useState('selectCount'); // 'selectCount' or 'selectMembers'

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
        setTeams(Array(count * 2).fill([])); // 각 팀당 2개 (팀1, 팀2)
    };

    // 멤버 선택/해제
    const toggleMember = (member) => {
        const maxMembers = teamCount * 10; // 팀당 10명
        
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

    // 자동 밸런스
    const autoBalance = () => {
        const requiredMembers = teamCount * 10;
        if (selectedMembers.length !== requiredMembers) {
            alert(`정확히 ${requiredMembers}명을 선택해주세요. (현재: ${selectedMembers.length}명)`);
            return;
        }

        // 멤버들을 티어 점수로 정렬
        const sortedMembers = [...selectedMembers].sort((a, b) => 
            getTierScore(b.tier) - getTierScore(a.tier)
        );

        // 팀 배분 (snake draft 방식)
        const newTeams = Array(teamCount * 2).fill(null).map(() => []);
        
        sortedMembers.forEach((member, index) => {
            const round = Math.floor(index / (teamCount * 2));
            const pick = index % (teamCount * 2);
            
            // 홀수 라운드는 역순으로
            if (round % 2 === 0) {
                newTeams[pick].push(member);
            } else {
                newTeams[teamCount * 2 - 1 - pick].push(member);
            }
        });

        setTeams(newTeams);
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
                            자동 밸런스
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
                            
                            return (
                                <div key={index} className="bg-white rounded-lg shadow p-4">
                                    <h2 className={`font-bold mb-3 text-${teamColor}-600`}>
                                        매치 {matchNumber} - 팀 {teamNumber}
                                    </h2>
                                    <div className="space-y-2">
                                        {team.map((member, idx) => (
                                            <div key={member.id} className={`p-2 bg-${teamColor}-50 rounded`}>
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
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    {team.length > 0 && (
                                        <div className="mt-3 pt-3 border-t text-sm text-gray-600">
                                            평균 티어 점수: {(team.reduce((sum, m) => sum + getTierScore(m.tier), 0) / team.length).toFixed(1)}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

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
                                        {member.name} ✕
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
