// hooks/useMembers.js
// 회원 데이터 관리 커스텀 훅
function useMembers() {
    const [members, setMembers] = React.useState([]);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState(null);

    // Firebase에서 회원 데이터 실시간 감지
    React.useEffect(() => {
        const unsubscribe = db.collection('lol_members')
            .orderBy('createdAt', 'desc')
            .onSnapshot(
                (snapshot) => {
                    const memberData = snapshot.docs.map(doc => ({
                        id: doc.id,
                        ...doc.data()
                    }));
                    setMembers(memberData);
                    setLoading(false);
                    setError(null);
                },
                (err) => {
                    console.error('회원 데이터 로드 실패:', err);
                    setError('회원 데이터를 불러오는데 실패했습니다.');
                    setLoading(false);
                }
            );

        return () => unsubscribe();
    }, []);

    // 회원 추가
    const addMember = async (memberData) => {
        try {
            await db.collection('lol_members').add({
                ...memberData,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            return { success: true };
        } catch (error) {
            console.error('회원 추가 실패:', error);
            return { success: false, error: '회원 추가에 실패했습니다.' };
        }
    };

    // 회원 수정
    const updateMember = async (memberId, memberData) => {
        try {
            await db.collection('lol_members').doc(memberId).update({
                ...memberData,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            return { success: true };
        } catch (error) {
            console.error('회원 수정 실패:', error);
            return { success: false, error: '회원 수정에 실패했습니다.' };
        }
    };

    // 회원 삭제
    const deleteMember = async (memberId) => {
        try {
            await db.collection('lol_members').doc(memberId).delete();
            return { success: true };
        } catch (error) {
            console.error('회원 삭제 실패:', error);
            return { success: false, error: '회원 삭제에 실패했습니다.' };
        }
    };

    // 회원 저장 (추가 또는 수정)
    const saveMember = async (memberData, memberId = null) => {
        if (memberId) {
            return await updateMember(memberId, memberData);
        } else {
            return await addMember(memberData);
        }
    };

    // 티어 인라인 수정
    const updateMemberTier = async (memberId, newTier) => {
        try {
            const tierMatch = newTier.match(/([a-zA-Z]+)(\d*)/);
            const tierName = tierMatch ? tierMatch[1] : 'Unranked';
            const tierNumber = tierMatch ? tierMatch[2] : '';
            
            await db.collection('lol_members').doc(memberId).update({
                tier: newTier,
                tierName: tierName,
                tierNumber: tierNumber,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            return { success: true };
        } catch (error) {
            console.error('티어 수정 실패:', error);
            return { success: false, error: '티어 수정에 실패했습니다.' };
        }
    };

    // 주라인 인라인 수정
    const updateMemberPosition = async (memberId, newPosition) => {
        try {
            await db.collection('lol_members').doc(memberId).update({
                mainPosition: newPosition,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            return { success: true };
        } catch (error) {
            console.error('주라인 수정 실패:', error);
            return { success: false, error: '주라인 수정에 실패했습니다.' };
        }
    };

    // 부라인 인라인 수정
    const updateMemberSubPositions = async (memberId, subPositions) => {
        try {
            await db.collection('lol_members').doc(memberId).update({
                subPositions: subPositions.join(','),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            return { success: true };
        } catch (error) {
            console.error('부라인 수정 실패:', error);
            return { success: false, error: '부라인 수정에 실패했습니다.' };
        }
    };

    // CSV 가져오기
    const importFromCSV = async (file) => {
        return new Promise((resolve, reject) => {
            Papa.parse(file, {
                complete: async (results) => {
                    try {
                        const existingNames = new Set(members.map(m => m.name));
                        const batch = db.batch();
                        let count = 0;
                        
                        results.data.forEach((row, i) => {
                            if (i < 13 || !row[1] || !row[2]) return;
                            if (existingNames.has(row[1])) return;
                            
                            const positions = [row[13], row[14], row[15], row[16], row[17]];
                            const mainIdx = positions.findIndex(p => p === '●');
                            const subIndices = positions.map((p, idx) => p === '○' ? idx : -1).filter(idx => idx >= 0);
                            
                            const tierName = row[11] || 'Unranked';
                            const tierNumber = row[12] || '';
                            
                            batch.set(db.collection('lol_members').doc(), {
                                name: row[1],
                                nickname: row[2],
                                birthYear: row[3] || '',
                                tier: tierName + tierNumber,
                                tierName,
                                tierNumber,
                                mainPosition: mainIdx >= 0 ? POSITIONS[mainIdx] : '없음',
                                subPositions: subIndices.map(idx => POSITIONS[idx]).join(','),
                                note: row[7] || '',
                                createdAt: firebase.firestore.FieldValue.serverTimestamp()
                            });
                            count++;
                        });
                        
                        await batch.commit();
                        resolve({ success: true, count });
                    } catch (error) {
                        reject({ success: false, error: 'CSV 가져오기에 실패했습니다.' });
                    }
                },
                encoding: 'UTF-8',
                error: (error) => {
                    reject({ success: false, error: 'CSV 파일 읽기에 실패했습니다.' });
                }
            });
        });
    };

    return {
        // 상태
        members,
        loading,
        error,
        
        // 기본 CRUD
        saveMember,
        deleteMember,
        
        // 인라인 수정
        updateMemberTier,
        updateMemberPosition,
        updateMemberSubPositions,
        
        // CSV 처리
        importFromCSV
    };
}
