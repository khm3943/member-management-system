// pages/TeamBuilder.js (간소화된 버전 - 400줄 → 100줄)
function TeamBuilder() {
    // 회원 데이터
    const { members } = useMembers();
    
    // 팀 빌더 로직 (⭐ 기본 5팀 설정)
    const {
        selectedMembers,
        teamCount,
        teams,
        stage,
        changeTeamCount,
        toggleMember,
        autoBalance,
        reset,
        handleDragStart,
        handleDrop,
        clearDrag,
        getMatchBalanceStats,
        requiredMembers,
        isComplete,
        hasTeams
    } = useTeamBuilder(5); // ⭐ 기본 5팀

    // 검색
    const [searchTerm, setSearchTerm] = React.useState('');
    const filteredMembers = members.filter(m => 
        m.nickname.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.name.includes(searchTerm)
    );

    // 핸들러들
    const handleMemberToggle = (member) => {
        const result = toggleMember(member);
        if (!result.success) {
            alert(result.error);
        }
    };

    const handleAutoBalance = () => {
        const result = autoBalance();
        if (!result.success) {
            alert(result.error);
        }
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDropOnTeam = (e, teamIndex) => {
        e.preventDefault();
        handleDrop(teamIndex);
    };

    // 팀 개수 선택 화면
    if (stage === 'selectCount') {
        return (
            <div className="p-6">
                <TeamCountSelector 
                    onSelectCount={(count) => {
                        changeTeamCount(count);
                    }}
                    defaultCount={5} // ⭐ 기본 5팀
                />
            </div>
        );
    }

    // 메인 팀 빌더 화면
    return (
        <div className="p-6">
            {/* 헤더 */}
            <TeamBuilderHeader
                teamCount={teamCount}
                selectedCount={selectedMembers.length}
                requiredCount={requiredMembers}
                hasTeams={hasTeams}
                onReset={reset}
                onChangeTeamCount={() => changeTeamCount(null)}
            />

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                {/* 멤버 선택 영역 */}
                <div className="lg:col-span-1">
                    <MemberSelector
                        members={filteredMembers}
                        selectedMembers={selectedMembers}
                        searchTerm={searchTerm}
                        onSearchChange={setSearchTerm}
                        onMemberToggle={handleMemberToggle}
                        onAutoBalance={handleAutoBalance}
                        canAutoBalance={isComplete}
                    />
                </div>

                {/* 팀 표시 영역 */}
                <div className="lg:col-span-3">
                    <TeamGrid
                        teams={teams}
                        onDragStart={handleDragStart}
                        onDragOver={handleDragOver}
                        onDrop={handleDropOnTeam}
                        draggedFromTeam={null} // draggedFromTeam 상태가 필요하면 훅에서 가져오기
                    />

                    {/* 팀 밸런스 요약 */}
                    {hasTeams && (
                        <TeamBalanceSummary 
                            balanceStats={getMatchBalanceStats()}
                        />
                    )}

                    {/* 선택된 멤버 요약 */}
                    {selectedMembers.length > 0 && !hasTeams && (
                        <SelectedMembersSummary
                            selectedMembers={selectedMembers}
                            onMemberRemove={handleMemberToggle}
                        />
                    )}
                </div>
            </div>
        </div>
    );
}

// 헤더 컴포넌트
function TeamBuilderHeader({ teamCount, selectedCount, requiredCount, hasTeams, onReset, onChangeTeamCount }) {
    return (
        <div className="bg-white rounded-lg shadow p-4 mb-4">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold">
                        {teamCount}팀 짜기 ⭐
                    </h1>
                    <p className="text-gray-600">
                        {requiredCount}명을 선택하세요 (현재: {selectedCount}명)
                        {hasTeams && " - 드래그로 팀원 이동 가능"}
                    </p>
                </div>
                <div className="flex gap-2">
                    <button onClick={onChangeTeamCount} className="btn btn-gray">
                        팀 수 변경
                    </button>
                    <button onClick={onReset} className="btn btn-gray">
                        처음으로
                    </button>
                </div>
            </div>
        </div>
    );
}

// 간단한 팀 밸런스 요약 컴포넌트
function TeamBalanceSummary({ balanceStats }) {
    return (
        <div className="mt-4 bg-gray-100 rounded-lg p-4">
            <h3 className="font-bold mb-2">팀 밸런스 요약</h3>
            <div className="space-y-2">
                {balanceStats.map((stat) => (
                    <div key={stat.matchIndex} className="border rounded p-3 bg-white">
                        <div className="font-medium mb-1">매치 {stat.matchIndex}</div>
                        <div className="text-sm grid grid-cols-2 gap-2">
                            <div>
                                <span className="font-medium">티어 차이:</span>
                                <span className={`ml-2 ${stat.tierDiff > 0.5 ? 'text-red-600' : 'text-green-600'}`}>
                                    {stat.tierDiff.toFixed(2)}점
                                </span>
                            </div>
                            <div>
                                <span className="font-medium">포지션:</span>
                                <span className={`ml-2 ${stat.positionBalance ? 'text-green-600' : 'text-yellow-600'}`}>
                                    {stat.positionBalance ? '균형' : '불균형'}
                                </span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

// 선택된 멤버 요약 컴포넌트
function SelectedMembersSummary({ selectedMembers, onMemberRemove }) {
    return (
        <div className="mt-4 bg-gray-100 rounded-lg p-4">
            <h3 className="font-bold mb-2">선택된 멤버 ({selectedMembers.length}명)</h3>
            <div className="flex flex-wrap gap-2">
                {selectedMembers.map(member => (
                    <span
                        key={member.id}
                        className="px-2 py-1 bg-white rounded text-sm cursor-pointer hover:bg-red-100"
                        onClick={() => onMemberRemove(member)}
                    >
                        {member.name} ({member.mainPosition}) ✕
                    </span>
                ))}
            </div>
        </div>
    );
}
