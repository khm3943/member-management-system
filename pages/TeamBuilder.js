// 팀 짜기 페이지 컴포넌트
function TeamBuilder() {
    const [members, setMembers] = useState([]);
    const [selectedMembers, setSelectedMembers] = useState([]);
    const [teams, setTeams] = useState({ team1: [], team2: [] });

    useEffect(() => {
        return db.collection('lol_members').orderBy('tier', 'desc')
            .onSnapshot(snap => {
                setMembers(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            });
    }, []);

    const toggleMember = (member) => {
        if (selectedMembers.find(m => m.id === member.id)) {
            setSelectedMembers(selectedMembers.filter(m => m.id !== member.id));
        } else {
            if (selectedMembers.length < 10) {
                setSelectedMembers([...selectedMembers, member]);
            } else {
                alert('최대 10명까지만 선택 가능합니다.');
            }
        }
    };

    const autoBalance = () => {
        if (selectedMembers.length !== 10) {
            alert('정확히 10명을 선택해주세요.');
            return;
        }

        // 멤버들을 티어 점수로 정렬
        const sortedMembers = [...selectedMembers].sort((a, b) => 
            getTierScore(b.tier) - getTierScore(a.tier)
        );

        // 지그재그로 팀 배분
        const newTeam1 = [];
        const newTeam2 = [];
        sortedMembers.forEach((member, index) => {
            if (index % 2 === 0) {
                newTeam1.push(member);
            } else {
                newTeam2.push(member);
            }
        });

        setTeams({ team1: newTeam1, team2: newTeam2 });
    };

    const clearTeams = () => {
        setSelectedMembers([]);
        setTeams({ team1: [], team2: [] });
    };

    return (
        <div className="p-6">
            <div className="bg-white rounded-lg shadow p-4 mb-4">
                <h1 className="text-2xl font-bold mb-3">팀 짜기</h1>
                <p className="text-gray-600">10명을 선택한 후 자동 밸런스를 클릭하세요.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* 회원 선택 영역 */}
                <div className="lg:col-span-1">
                    <div className="bg-white rounded-lg shadow p-4">
                        <h2 className="font-bold mb-3">회원 선택 ({selectedMembers.length}/10)</h2>
                        <div className="space-y-2 max-h-96 overflow-y-auto">
                            {members.map(member => (
                                <div
                                    key={member.id}
                                    onClick={() => toggleMember(member)}
                                    className={`p-2 rounded cursor-pointer transition ${
                                        selectedMembers.find(m => m.id === member.id)
                                            ? 'bg-blue-100 border-blue-500 border'
                                            : 'hover:bg-gray-100 border border-gray-200'
                                    }`}
                                >
                                    <div className="flex justify-between items-center">
                                        <span className="font-medium">{member.name}</span>
                                        <span className={`tier text-xs ${getTierClass(member.tier)}`}>
                                            {member.tier || 'Unranked'}
                                        </span>
                                    </div>
                                    <div className="text-xs text-gray-600">
                                        {member.mainPosition}
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="mt-4 space-y-2">
                            <button
                                onClick={autoBalance}
                                className="w-full btn btn-blue"
                                disabled={selectedMembers.length !== 10}
                            >
                                자동 밸런스
                            </button>
                            <button
                                onClick={clearTeams}
                                className="w-full btn btn-gray"
                            >
                                초기화
                            </button>
                        </div>
                    </div>
                </div>

                {/* 팀 표시 영역 */}
                <div className="lg:col-span-2">
                    <div className="grid grid-cols-2 gap-4">
                        {/* 팀 1 */}
                        <div className="bg-white rounded-lg shadow p-4">
                            <h2 className="font-bold mb-3 text-blue-600">팀 1</h2>
                            <div className="space-y-2">
                                {teams.team1.map((member, index) => (
                                    <div key={member.id} className="p-2 bg-blue-50 rounded">
                                        <div className="flex justify-between">
                                            <span>{index + 1}. {member.name}</span>
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
                            {teams.team1.length > 0 && (
                                <div className="mt-3 pt-3 border-t text-sm text-gray-600">
                                    평균 티어 점수: {(teams.team1.reduce((sum, m) => sum + getTierScore(m.tier), 0) / teams.team1.length).toFixed(1)}
                                </div>
                            )}
                        </div>

                        {/* 팀 2 */}
                        <div className="bg-white rounded-lg shadow p-4">
                            <h2 className="font-bold mb-3 text-red-600">팀 2</h2>
                            <div className="space-y-2">
                                {teams.team2.map((member, index) => (
                                    <div key={member.id} className="p-2 bg-red-50 rounded">
                                        <div className="flex justify-between">
                                            <span>{index + 1}. {member.name}</span>
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
                            {teams.team2.length > 0 && (
                                <div className="mt-3 pt-3 border-t text-sm text-gray-600">
                                    평균 티어 점수: {(teams.team2.reduce((sum, m) => sum + getTierScore(m.tier), 0) / teams.team2.length).toFixed(1)}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
