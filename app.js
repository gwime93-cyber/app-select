document.addEventListener('DOMContentLoaded', () => {
    // --- 초기 설정 및 데이터 ---
    let savedResults = JSON.parse(localStorage.getItem('savedResults') || '[]');
    let currentResult = null;

    const views = {
        home: document.getElementById('home-view'),
        weatherSetup: document.getElementById('weather-setup-view'),
        photoSetup: document.getElementById('photo-setup-view'),
        searchSetup: document.getElementById('search-setup-view'),
        play: document.getElementById('play-view'),
        result: document.getElementById('result-view'),
        collection: document.getElementById('collection-view')
    };

    const defaultImg = 'data:image/svg+xml;charset=UTF-8,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"%3E%3Crect width="100" height="100" fill="%23eeeeee"/%3E%3Ctext x="50" y="50" font-family="Arial" font-size="12" text-anchor="middle" dominant-baseline="middle" fill="%23999999"%3ENo Image%3C/text%3E%3C/svg%3E';

    const state = {
        mode: null, // 'weather', 'photo', 'search'
        choices: [], // { text, image, emoji }
        searchResults: [],
        searchChoices: [],
        previousView: 'home'
    };

    // --- DOM 요소 ---
    // Home
    const modeWeatherBtn = document.getElementById('mode-weather-btn');
    const modePhotoBtn = document.getElementById('mode-photo-btn');
    const modeSearchBtn = document.getElementById('mode-search-btn');
    const modeCollectionBtn = document.getElementById('mode-collection-btn');

    // Setup: Weather
    const weatherCheckboxes = document.querySelectorAll('.weather-chk');
    const weatherStartBtn = document.getElementById('weather-start-btn');

    // Setup: Photo & Album
    const photoChoicesContainer = document.getElementById('photo-choices-container');
    const photoStartBtn = document.getElementById('photo-start-btn');
    const photoTemplate = document.getElementById('photo-choice-template');

    // Setup: Search
    const searchChoicesContainer = document.getElementById('search-choices-container');
    const searchStartBtn = document.getElementById('search-start-btn');
    const searchInput = document.getElementById('image-search-input');
    const searchBtn = document.getElementById('image-search-btn');

    // Play
    const playChoicesContainer = document.getElementById('play-choices-container');

    // Result
    const finalImg = document.getElementById('final-choice-img');
    const finalEmoji = document.getElementById('final-choice-emoji');
    const finalText = document.getElementById('final-choice-text');
    const saveResultBtn = document.getElementById('save-result-btn');
    const reSelectBtn = document.getElementById('re-select-btn');
    const backToSetupBtn = document.getElementById('back-to-setup-btn');
    const backFromCollectionBtn = document.getElementById('back-from-collection-btn');
    const goToCollectionFromResultBtn = document.getElementById('go-to-collection-from-result-btn');
    const weatherResetBtn = document.getElementById('weather-reset-btn');
    const photoResetBtn = document.getElementById('photo-reset-btn');
    const searchResetBtn = document.getElementById('search-reset-btn');

    // Global
    const goHomeBtns = document.querySelectorAll('.go-home-btn');


    // --- 이벤트 리스너 ---

    if (reSelectBtn) {
        reSelectBtn.addEventListener('click', () => {
            // 다시 선택하기 버튼 - 플레이 화면으로 돌아가기 (카드 투명도 리셋을 위해 startPlay 재호출 가능)
            startPlay();
        });
    }

    if (goToCollectionFromResultBtn) {
        goToCollectionFromResultBtn.addEventListener('click', () => {
            // 결과 화면에서 바로 보관함으로 이동
            renderCollectionView();
            switchView('collection');
        });
    }

    if (backFromCollectionBtn) {
        backFromCollectionBtn.addEventListener('click', () => {
            // 보관함에서 이전 화면으로 돌아가기
            switchView(state.previousView || 'home');
        });
    }

    if (backToSetupBtn) {
        backToSetupBtn.addEventListener('click', () => {
            // 선택지 다시 준비하기 - 현재 모드에 맞는 설정 화면으로 돌아가기
            if (state.mode === 'weather') switchView('weatherSetup');
            else if (state.mode === 'photo') switchView('photoSetup');
            else if (state.mode === 'search') switchView('searchSetup');
            else switchView('home');
        });
    }

    // 홈 버튼들
    modeWeatherBtn.addEventListener('click', () => {
        state.mode = 'weather';
        switchView('weatherSetup');
    });

    modePhotoBtn.addEventListener('click', () => {
        state.mode = 'photo';
        initSlots(photoChoicesContainer, 'photo');
        switchView('photoSetup');
    });

    modeSearchBtn.addEventListener('click', () => {
        state.mode = 'search';
        initSlots(searchChoicesContainer, 'search');
        switchView('searchSetup');
    });

    modeCollectionBtn.addEventListener('click', () => {
        renderCollectionView();
        switchView('collection');
    });

    goHomeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            resetAllState();
            switchView('home');
        });
    });

    // 날씨 설정
    function updateWeatherStartBtn() {
        const checkedCount = document.querySelectorAll('.weather-chk:checked').length;
        weatherStartBtn.disabled = (checkedCount < 2 || checkedCount > 4);
    }

    weatherCheckboxes.forEach(chk => {
        chk.addEventListener('change', (e) => {
            const checkedCount = document.querySelectorAll('.weather-chk:checked').length;
            if (checkedCount > 4) {
                e.target.checked = false;
                alert('날씨는 최대 4개까지만 선택할 수 있습니다.');
                return;
            }
            updateWeatherStartBtn();
        });
    });
    updateWeatherStartBtn(); // 초기 상태 설정 (체크된 항목이 2개 이상일 경우 버튼 활성화)

    weatherStartBtn.addEventListener('click', () => {
        const checked = document.querySelectorAll('.weather-chk:checked');
        state.choices = Array.from(checked).map(c => ({
            text: c.value,
            emoji: c.getAttribute('data-img'),
            image: null
        }));
        startPlay();
    });

    // 설정 슬롯 공통 초기화
    function initSlots(container, mode) {
        container.innerHTML = '';
        for (let i = 0; i < 4; i++) {
            addChoiceSlot(container, mode);
        }
    }

    function addChoiceSlot(container, mode) {
        const clone = photoTemplate.content.cloneNode(true);
        const card = clone.querySelector('.choice-card');
        const cameraInput = clone.querySelector('.choice-camera-input');
        const albumInput = clone.querySelector('.choice-album-input');
        const previewArea = clone.querySelector('.image-preview-area');
        const previewImg = clone.querySelector('.image-preview');
        const placeholder = clone.querySelector('.upload-placeholder');
        const textInput = clone.querySelector('.choice-text-input');
        const btnCamera = clone.querySelector('.btn-camera-trigger');
        const btnAlbum = clone.querySelector('.btn-album-trigger');
        const guideText = clone.querySelector('.upload-guide-text');

        // 모드별 버튼 및 가이드 텍스트 최적화
        if (mode === 'album') {
            if (btnCamera) btnCamera.style.display = 'none';
            if (btnAlbum) {
                btnAlbum.innerHTML = '🖼️ 이미지 불러오기';
                btnAlbum.style.width = '100%';
            }
            if (guideText) guideText.textContent = '이미지 파일을 여기로 끌어다 놓으세요';
        } else if (mode === 'search') {
            if (btnCamera) btnCamera.style.display = 'none';
            if (btnAlbum) btnAlbum.style.display = 'none';
            if (guideText) guideText.textContent = '검색한 이미지를 여기로 끌어다 놓으세요';
        }

        // 📷 카메라 버튼 → 카메라 input 트리거
        if (btnCamera) {
            btnCamera.addEventListener('click', (e) => {
                e.stopPropagation();
                cameraInput.click();
            });
        }

        // 🖼️ 앨범 버튼 → 앨범 input 트리거
        if (btnAlbum) {
            btnAlbum.addEventListener('click', (e) => {
                e.stopPropagation();
                albumInput.click();
            });
        }

        // 빈 영역(드롭존) 클릭 시 상호작용
        previewArea.addEventListener('click', () => {
            if (previewImg.hidden) {
                if (mode === 'photo') {
                    albumInput.click();
                }
            }
        });

        // 이미지 미리보기 클릭 시 재선택
        previewImg.addEventListener('click', () => albumInput.click());

        // 파일 읽기 공통 헬퍼
        function handleFile(file) {
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (event) => {
                previewImg.src = event.target.result;
                previewImg.hidden = false;
                placeholder.hidden = true;
                updateSetupStartBtn(mode);
            };
            reader.readAsDataURL(file);
        }

        if (cameraInput) cameraInput.addEventListener('change', (e) => handleFile(e.target.files[0]));
        if (albumInput) albumInput.addEventListener('change', (e) => handleFile(e.target.files[0]));


        // 드래그 앤 드롭
        previewArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            previewArea.classList.add('drag-over');
        });

        previewArea.addEventListener('dragleave', () => {
            previewArea.classList.remove('drag-over');
        });

        previewArea.addEventListener('drop', (e) => {
            e.preventDefault();
            previewArea.classList.remove('drag-over');

            // 1. 파일 드롭 처리 (Base64 변환 추가)
            if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                const file = e.dataTransfer.files[0];
                if (file.type.startsWith('image/')) {
                    const reader = new FileReader();
                    reader.onload = (event) => {
                        const base64Data = event.target.result;
                        previewImg.src = base64Data;
                        previewImg.hidden = false;
                        placeholder.hidden = true;
                        updateSetupStartBtn(mode);
                    };
                    reader.readAsDataURL(file);
                }
                return;
            }

            // 2. 외부 이미지 URL 드롭 (스플릿 뷰 대응)
            const html = e.dataTransfer.getData('text/html');
            if (html) {
                const div = document.createElement('div');
                div.innerHTML = html;
                const img = div.querySelector('img');
                if (img && img.src) {
                    // 외부 URL 이미지를 Canvas를 이용해 Base64로 변환 시도 (CORS 등 이슈 가능성 있으나 iPad 환경 고려)
                    // 여기서는 우선 src를 그대로 넣고, 추후 저장 시 혹은 로드 시 Base64 처리를 강화할 수 있음.
                    // 간단히 src로 설정
                    previewImg.src = img.src;
                    previewImg.hidden = false;
                    placeholder.hidden = true;

                    // 만약 alt 속성이 있다면 이름 자동 입력
                    if (img.alt && !textInput.value) {
                        textInput.value = img.alt;
                    }
                    updateSetupStartBtn(mode);
                }
            }
        });

        container.appendChild(clone);
    }

    function updateSetupStartBtn(mode) {
        let container, btn;
        if (mode === 'photo') {
            container = photoChoicesContainer;
            btn = photoStartBtn;
        } else {
            container = searchChoicesContainer;
            btn = searchStartBtn;
        }
        const slotsWithImage = container.querySelectorAll('.image-preview:not([hidden])').length;
        btn.disabled = slotsWithImage < 2;
    }

    photoStartBtn.addEventListener('click', () => {
        const cards = photoChoicesContainer.querySelectorAll('.choice-card');
        state.choices = [];
        cards.forEach(card => {
            const img = card.querySelector('.image-preview');
            const txt = card.querySelector('.choice-text-input');
            if (!img.hidden) {
                state.choices.push({
                    text: txt.value || '',
                    image: img.src,
                    emoji: null
                });
            }
        });
        startPlay();
    });

    searchStartBtn.addEventListener('click', () => {
        const cards = searchChoicesContainer.querySelectorAll('.choice-card');
        state.choices = [];
        cards.forEach(card => {
            const img = card.querySelector('.image-preview');
            const txt = card.querySelector('.choice-text-input');
            if (!img.hidden) {
                state.choices.push({
                    text: txt.value || '',
                    image: img.src,
                    emoji: null
                });
            }
        });
        startPlay();
    });

    searchBtn.addEventListener('click', () => {
        const query = searchInput.value.trim();
        if (query) {
            window.open(`https://www.google.com/search?q=${encodeURIComponent(query)}&tbm=isch`, '_blank');
        } else {
            alert('검색어를 입력해주세요.');
        }
    });


    // --- 게임 진행 (Play) ---

    function startPlay() {
        switchView('play');
        playChoicesContainer.innerHTML = '';

        state.choices.forEach(choice => {
            const card = document.createElement('div');
            card.className = 'play-choice-card';

            if (choice.emoji) {
                const emj = document.createElement('div');
                emj.className = 'play-choice-emoji';
                emj.textContent = choice.emoji;
                card.appendChild(emj);
            } else {
                const img = document.createElement('img');
                img.src = choice.image || defaultImg;
                card.appendChild(img);
            }

            const label = document.createElement('span');
            label.textContent = choice.text;
            card.appendChild(label);

            card.addEventListener('click', () => {
                // 진동 효과 (지원 시)
                if (navigator.vibrate) navigator.vibrate(50);
                confirmChoice(choice);
            });

            playChoicesContainer.appendChild(card);
        });
    }

    function confirmChoice(choice) {
        // 애니메이션 효과 후 결과 창으로
        const allCards = document.querySelectorAll('.play-choice-card');
        allCards.forEach(c => c.style.opacity = '0.3');

        switchView('result');
        showResult(choice);
    }

    function showResult(choice) {
        if (choice.emoji) {
            finalEmoji.textContent = choice.emoji;
            finalEmoji.hidden = false;
            finalImg.hidden = true;
        } else {
            finalImg.src = choice.image || defaultImg;
            finalImg.hidden = false;
            finalEmoji.hidden = true;
        }
        finalText.textContent = choice.text;
    }

    // 이미지 용량 압축 헬퍼 (localStorage QuotaExceededError 방지)
    function compressImage(src, maxWidth = 400, quality = 0.7) {
        return new Promise((resolve) => {
            // 외부 URL이거나 이미 압축된 경우 그대로 반환
            if (!src || !src.startsWith('data:')) {
                resolve(src);
                return;
            }
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ratio = Math.min(maxWidth / img.width, maxWidth / img.height, 1);
                canvas.width = img.width * ratio;
                canvas.height = img.height * ratio;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                resolve(canvas.toDataURL('image/jpeg', quality));
            };
            img.onerror = () => resolve(src); // 실패 시 원본 유지
            img.src = src;
        });
    }

    saveResultBtn.addEventListener('click', async () => {
        if (!currentResult) return;

        try {
            // 이미지가 있을 경우 저장 전 압축 처리
            let resultToSave = { ...currentResult };
            if (resultToSave.image && resultToSave.image.startsWith('data:')) {
                resultToSave.image = await compressImage(resultToSave.image);
            }

            savedResults.push(resultToSave);
            localStorage.setItem('savedResults', JSON.stringify(savedResults));

            saveResultBtn.disabled = true;
            saveResultBtn.textContent = '✅ 저장 완료!';
            alert('카드가 보관함에 성공적으로 저장되었습니다! 홈의 보관함 메뉴에서 언제든 확인 및 인쇄할 수 있습니다.');
        } catch (e) {
            // savedResults에서 방금 푸시한 항목 제거 (저장 실패 시 롤백)
            savedResults.pop();
            if (e.name === 'QuotaExceededError') {
                alert('저장공간이 부족합니다. 보관함 비우기를 통해 일부 카드를 삭제 후 다시 시도해 주세요.');
            } else {
                alert('저장 중 오류가 발생했습니다. 다시 시도해 주세요.');
            }
        }
    });

    // showResult를 덮어씌워 currentResult 갱신 및 버튼 상태 리셋
    const originalShowResult = showResult;
    showResult = function (choice) {
        currentResult = choice;
        saveResultBtn.disabled = false;
        saveResultBtn.textContent = '🗂️ 앨범(보관함)에 저장';
        originalShowResult(choice);
    };

    // --- 보관함(Collection) 및 출력 제어 ---
    const collectionGrid = document.getElementById('collection-grid');
    const emptyMsg = document.getElementById('empty-collection-msg');
    const printCollectionBtn = document.getElementById('print-collection-btn');
    const clearCollectionBtn = document.getElementById('clear-collection-btn');

    function renderCollectionView() {
        collectionGrid.innerHTML = '';
        const selectionControls = document.getElementById('selection-controls');

        if (savedResults.length === 0) {
            emptyMsg.hidden = false;
            printCollectionBtn.disabled = true;
            clearCollectionBtn.disabled = true;
            if (selectionControls) selectionControls.style.display = 'none';
            return;
        }

        emptyMsg.hidden = true;
        printCollectionBtn.disabled = false;
        clearCollectionBtn.disabled = false;
        if (selectionControls) {
            selectionControls.style.display = 'flex';

            // 버튼 이벤트 연결 (한 번만 연결하면 좋지만, 렌더링 시점에 확실하게 하기 위해)
            document.getElementById('select-all-btn').onclick = () => {
                const checkboxes = collectionGrid.querySelectorAll('.choice-checkbox');
                checkboxes.forEach(cb => cb.checked = true);
            };
            document.getElementById('deselect-all-btn').onclick = () => {
                const checkboxes = collectionGrid.querySelectorAll('.choice-checkbox');
                checkboxes.forEach(cb => cb.checked = false);
            };
        }

        savedResults.forEach((choice, index) => {
            const card = document.createElement('div');
            card.className = 'play-choice-card collection-item';
            card.style.position = 'relative';

            // 선택용 체크박스
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.className = 'choice-checkbox';
            checkbox.checked = true;
            checkbox.style.cssText = 'position: absolute; top: 10px; left: 10px; width: 22px; height: 22px; z-index: 10; cursor: pointer;';
            checkbox.onclick = (e) => e.stopPropagation();
            card.appendChild(checkbox);

            // 삭제 버튼
            const removeBtn = document.createElement('button');
            removeBtn.className = 'remove-choice-btn';
            removeBtn.innerHTML = '×';
            removeBtn.onclick = (e) => {
                e.stopPropagation();
                if (confirm('이 카드를 삭제하시겠습니까?')) {
                    savedResults.splice(index, 1);
                    localStorage.setItem('savedResults', JSON.stringify(savedResults));
                    renderCollectionView();
                }
            };
            card.appendChild(removeBtn);

            card.onclick = () => {
                checkbox.checked = !checkbox.checked;
            };

            if (choice.emoji) {
                const emojiDiv = document.createElement('div');
                emojiDiv.className = 'play-choice-emoji';
                emojiDiv.textContent = choice.emoji;
                card.appendChild(emojiDiv);
            } else {
                const img = document.createElement('img');
                img.src = choice.image || defaultImg;
                card.appendChild(img);
            }

            const text = document.createElement('span');
            text.textContent = choice.text || '이름 없음';
            card.appendChild(text);

            collectionGrid.appendChild(card);
        });
    }

    clearCollectionBtn.addEventListener('click', () => {
        if (confirm('모든 보관된 카드를 삭제하시겠습니까? (이 작업은 되돌릴 수 없습니다)')) {
            savedResults = [];
            localStorage.removeItem('savedResults');
            renderCollectionView();
        }
    });

    // 직접 인쇄 로직
    if (printCollectionBtn) {
        printCollectionBtn.addEventListener('click', () => {
            const printArea = document.getElementById('print-area');
            const layout = parseInt(document.getElementById('print-layout-select').value) || 8;
            const orientation = document.getElementById('print-orientation-select').value || 'portrait';
            const cardType = document.getElementById('print-card-type-select').value || 'vertical';
            const borderStyle = document.getElementById('print-border-select')?.value || 'dashed';
            printArea.innerHTML = '';

            const checkboxes = collectionGrid.querySelectorAll('.choice-checkbox');
            const selectedResults = savedResults.filter((_, idx) => checkboxes[idx] && checkboxes[idx].checked);

            if (selectedResults.length === 0) {
                alert('인쇄할 항목을 최소 하나 이상 선택해 주세요.');
                return;
            }


            // A4 실제 mm 치수 (브라우저의 마진 간섭 없이 종이를 꽉 채우기 위해 JS에서 직접 주입)
            // 📱 기기 감지 (아이폰, 아이패드, 안드로이드 포함 모바일 감지)
            const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

            // PC는 표준 A4(210x297)를 사용하고, 모바일은 여백 오류 방지를 위해 3% 정도 줄인 안전 규격 사용
            let pageW, pageH;
            if (isMobile) {
                pageW = orientation === 'portrait' ? '204mm' : '286mm';
                pageH = orientation === 'portrait' ? '286mm' : '204mm';
            } else {
                pageW = orientation === 'portrait' ? '210mm' : '297mm';
                pageH = orientation === 'portrait' ? '297mm' : '210mm';
            }

            // @page 규칙: 여백 0, A4 크기 고정
            let printStyle = document.getElementById('dynamic-print-style');
            if (!printStyle) {
                printStyle = document.createElement('style');
                printStyle.id = 'dynamic-print-style';
                document.head.appendChild(printStyle);
            }
            printStyle.innerHTML = `
                @media print {
                    /* 하단 주소/날짜 강제 제거 시도 */
                    @page { size: A4 ${orientation}; margin: 0 !important; }
                    html, body { margin: 0 !important; padding: 0 !important; width: ${pageW} !important; height: ${pageH} !important; overflow: hidden !important; background: white !important; }
                }
            `;

            // 전체 출력 슬롯 개수 결정
            const slotsPerPage = layout;
            const totalSlots = Math.max(slotsPerPage, Math.ceil(savedResults.length / slotsPerPage) * slotsPerPage);

            for (let pageIdx = 0; pageIdx < Math.ceil(totalSlots / slotsPerPage); pageIdx++) {
                const pageEl = document.createElement('div');
                pageEl.className = 'print-page';
                pageEl.setAttribute('data-layout', layout.toString());
                pageEl.setAttribute('data-orientation', orientation);
                pageEl.setAttribute('data-card-type', cardType);
                pageEl.setAttribute('data-border', borderStyle);

                // 핵심: 종이 크기를 인라인 스타일로 직접 지정 (!important를 붙여 모바일 브라우저의 화면너비 해석 방지)
                pageEl.style.setProperty('width', pageW, 'important');
                pageEl.style.setProperty('height', pageH, 'important');
                pageEl.style.margin = '0';
                pageEl.style.padding = '0';  /* 모바일 축소 현상 방지를 위해 여백 완전 제거 */
                pageEl.style.boxSizing = 'border-box';
                pageEl.style.overflow = 'hidden';

                for (let i = 0; i < slotsPerPage; i++) {
                    const slotIdx = pageIdx * slotsPerPage + i;
                    const slot = document.createElement('div');
                    slot.className = 'print-slot';

                    const rotatedContainer = document.createElement('div');
                    rotatedContainer.className = 'print-rotated-container';

                    const choice = selectedResults[slotIdx % selectedResults.length];

                    if (choice.emoji) {
                        const emj = document.createElement('div');
                        emj.className = 'print-emoji';
                        emj.textContent = choice.emoji;
                        rotatedContainer.appendChild(emj);
                    } else if (choice.image) {
                        const img = document.createElement('img');
                        img.src = choice.image;
                        rotatedContainer.appendChild(img);
                    }

                    const text = document.createElement('div');
                    text.className = 'print-text';
                    text.textContent = choice.text || '';
                    rotatedContainer.appendChild(text);

                    slot.appendChild(rotatedContainer);
                    pageEl.appendChild(slot);
                }

                printArea.appendChild(pageEl);
            }

            // 인쇄 후 print-area 초기화
            window.onafterprint = () => {
                printArea.innerHTML = '';
            };

            // 인쇄 호출
            setTimeout(() => {
                window.print();
            }, 150);
        });
    }

    function resetAllState() {
        state.mode = null;
        state.choices = [];
        state.searchResults = [];
        state.searchChoices = [];

        searchInput.value = '';
        weatherCheckboxes.forEach((c, index) => {
            // 초기 4개는 체크된 상태로 되돌리기 (맑음, 구름, 비, 눈)
            c.checked = index < 4;
        });

        if (document.getElementById('search-choices-container')) {
            document.getElementById('search-choices-container').innerHTML = '';
        }
        photoChoicesContainer.innerHTML = '';

        // 홈 돌아가면서 Play 컨테이너도 비움
        playChoicesContainer.innerHTML = '';
    }

    // --- 초기화(Reset) 기능 핸들러 추가 ---
    if (weatherResetBtn) {
        weatherResetBtn.addEventListener('click', () => {
            weatherCheckboxes.forEach(chk => chk.checked = false);
            updateWeatherStartBtn();
        });
    }

    if (photoResetBtn) {
        photoResetBtn.addEventListener('click', () => {
            if (confirm('모든 사진과 이름을 초기화할까요?')) {
                initSlots(photoChoicesContainer, 'photo');
                photoStartBtn.disabled = true;
            }
        });
    }

    if (searchResetBtn) {
        searchResetBtn.addEventListener('click', () => {
            if (confirm('모든 검색 이미지와 검색어를 초기화할까요?')) {
                initSlots(searchChoicesContainer, 'search');
                searchStartBtn.disabled = true;
                if (searchInput) searchInput.value = '';
            }
        });
    }

    // 화면 전환 유틸
    function switchView(viewName) {
        // 현재 활성화된 화면을 '이전 화면'으로 저장 (보관함에서 돌아오기 등에서 활용)
        const currentActive = Object.keys(views).find(key => views[key].classList.contains('active'));
        if (currentActive && currentActive !== viewName) {
            state.previousView = currentActive;
        }

        Object.values(views).forEach(v => v.classList.remove('active'));
        views[viewName].classList.add('active');
        window.scrollTo(0, 0);
    }

});
