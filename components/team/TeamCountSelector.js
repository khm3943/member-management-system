// components/team/TeamCountSelector.js
// 팀 개수 선택 컴포넌트 (기본 5팀 강조)
function TeamCountSelector({ onSelectCount, defaultCount = 5 }) {
    const teamOptions = [1, 2, 3, 4, 5];
    
    // 페이지 로드 시 자동으로 기본값 설정
    React.useEffect(() => {
        if (defaultCount) {
            onSelectCount(defaultCount);
        }
    }, []);

    return (
        <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-lg shadow p-8 text-center">
                <h1 className="text-3xl font-bold mb-6">팀 짜기</h1>
                <p className="text-xl mb-4">몇 팀을 짜실건가요?</p>
                <p className="text-green-600 font-bold mb-8">
                    ⭐ 기본 추천: {defaultCount}팀 ({defaultCount * 10}명)
                </p>
                
                <div className="grid grid-cols-5 gap-4">
                    {teamOptions.map(num => (
                        <button
                            key={num}
                            onClick={() => onSelectCount(num)}
                            className={`btn text-2xl py-8 hover:scale-105 transition ${
                                num === defaultCount 
                                    ? 'btn-blue ring-4 ring-green-400 animate-pulse' 
                                    : 'btn-gray hover:btn-blue'
                            }`}
                        >
                            {num}
                            {num === defaultCount && (
                                <div className="text-sm mt-1 text-green-200">추천!</div>
                            )}
                        </button>
                    ))}
                </div>
                
                <div className="text-gray-600 mt-6 space-y-1">
                    {teamOptions.map(num => (
                        <div key={num} className={num === defaultCount ? 'font-bold text-green-600' : ''}>
                            {num}팀 = {num * 10}명 필요 ({num}개의 5대5)
                            {num === defaultCount && ' ⭐'}
                        </div>
                    ))}
                </div>
                
                {/* 자동 선택 버튼 */}
                <button
                    onClick={() => onSelectCount(defaultCount)}
                    className="mt-6 btn btn-green text-lg px-8 py-3"
                >
                    🚀 바로 {defaultCount}팀으로 시작하기
                </button>
            </div>
        </div>
    );
}
