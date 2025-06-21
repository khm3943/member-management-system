const { useState, useEffect } = React;

// Firebase 초기화
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// 메인 앱 컴포넌트
function App() {
    const [currentPage, setCurrentPage] = useState('members');

    // 메뉴 항목 설정
    const menuItems = [
        { id: 'members', name: '회원 관리', icon: '👥' },
        { id: 'teamBuilder', name: '팀 짜기', icon: '⚔️' },
        // 새로운 메뉴는 여기에 추가
    ];

    return (
        <div className="flex min-h-screen bg-gray-100">
            {/* 좌측 사이드바 */}
            <div className="w-64 bg-gray-900 text-white">
                <div className="p-4">
                    <h1 className="text-xl font-bold mb-6">LOL 관리 시스템</h1>
                    <nav className="space-y-2">
                        {menuItems.map(item => (
                            <button
                                key={item.id}
                                onClick={() => setCurrentPage(item.id)}
                                className={`w-full text-left px-4 py-2 rounded transition ${
                                    currentPage === item.id ? 'bg-blue-600' : 'hover:bg-gray-800'
                                }`}
                            >
                                {item.icon} {item.name}
                            </button>
                        ))}
                    </nav>
                </div>
            </div>

            {/* 우측 메인 컨텐츠 */}
            <div className="flex-1">
                {currentPage === 'members' && <MemberManagement />}
                {currentPage === 'teamBuilder' && <TeamBuilder />}
                {/* 새로운 페이지는 여기에 추가 */}
            </div>
        </div>
    );
}

// 앱 렌더링
ReactDOM.render(<App />, document.getElementById('root'));
