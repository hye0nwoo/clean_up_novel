let currentGroups = null;

function showProgress() {
    document.querySelector('.progress-container').style.display = 'block';
}

function hideProgress() {
    document.querySelector('.progress-container').style.display = 'none';
    document.querySelectorAll('.progress-bar-fill').forEach(bar => {
        bar.style.width = '0%';
    });
    document.querySelectorAll('.progress-details').forEach(details => {
        details.textContent = '';
    });
}

function updateProgressBar(type, percent, details) {
    const section = document.querySelector(`.${type}-progress`);
    if (!section) return;

    const bar = section.querySelector('.progress-bar-fill');
    const detailsElement = section.parentElement.querySelector('.progress-details');

    bar.style.transition = 'width 0.3s ease-in-out';
    bar.style.width = `${Math.min(100, Math.max(0, percent))}%`;

    if (details) {
        detailsElement.textContent = details;
    }
}

function showStatus(message, type) {
    const status = document.getElementById('status');
    status.textContent = message;
    status.className = `status ${type}`;
    status.style.display = 'block';
}

function displayGroups(groups) {
    const container = document.getElementById('groups');
    container.innerHTML = '';
    
    Object.entries(groups).forEach(async ([key, files], groupIndex) => {
        const group = document.createElement('div');
        group.className = 'group';
        
        const header = document.createElement('div');
        header.className = 'group-header';
        header.textContent = `그룹 ${groupIndex + 1}`;
        
        group.appendChild(header);
        
        const fileList = document.createElement('ul');
        fileList.className = 'file-list';
        
        files.forEach((file, fileIndex) => {
            const item = document.createElement('li');
            item.className = 'file-item';
            
            const info = document.createElement('div');
            info.className = 'file-info';
            
            // 파일 정보 표시 개선
            const fileName = window.electron.path.basename(file);
            const fileDir = window.electron.path.dirname(file);
            info.innerHTML = `
                <div class="file-name">${fileName}</div>
                <div class="file-path">${fileDir}</div>
            `;
            
            const actions = document.createElement('div');
            actions.className = 'file-actions';
            
            const keepButton = document.createElement('button');
            keepButton.textContent = '이 파일 유지';
            keepButton.onclick = () => handleKeepFile(groupIndex, file, files);
            
            actions.appendChild(keepButton);
            item.appendChild(info);
            item.appendChild(actions);
            fileList.appendChild(item);
        });
        
        group.appendChild(fileList);
        container.appendChild(group);
    });
}

async function handleKeepFile(groupIndex, keepFile, files) {
    try {
        showProgress();
        updateProgressBar('group', 50, '중복 파일 이동 중...');
        
        await window.electron.ipcRenderer.invoke('move-duplicates', {
            files,
            keepFile,
            duplicateDir: 'duplicates'
        });
        
        // 해당 그룹 요소를 찾아서 페이드아웃 효과와 함께 제거
        const groupDiv = document.querySelectorAll('.group')[groupIndex];
        if (groupDiv) {
            groupDiv.style.transition = 'opacity 0.5s ease';
            groupDiv.style.opacity = '0';
            setTimeout(() => {
                groupDiv.remove();
                
                // 남은 그룹이 없으면 완료 메시지 표시
                const remainingGroups = document.querySelectorAll('.group');
                if (remainingGroups.length === 0) {
                    showStatus('모든 중복 파일 처리가 완료되었습니다.', 'success');
                }
            }, 500);
        }
        
        updateProgressBar('group', 100, '이동 완료');
        showStatus('파일이 성공적으로 이동되었습니다.', 'success');
        setTimeout(hideProgress, 1000);
        
    } catch (error) {
        console.error('[오류] 파일 이동 중 오류 발생:', error);
        showStatus(`파일 이동 중 오류 발생: ${error.message}`, 'error');
        hideProgress();
    }
}

// 메인 이벤트 리스너
document.addEventListener('DOMContentLoaded', () => {
    let isProcessing = false;
    
    document.getElementById('selectDir').addEventListener('click', async () => {
        if (isProcessing) {
            return;
        }
        
        try {
            isProcessing = true;
            showProgress();
            
            const dirPath = await window.electron.ipcRenderer.invoke('select-directory');
            if (!dirPath) {
                hideProgress();
                return;
            }
            
            document.getElementById('selectedPath').textContent = dirPath;
            document.getElementById('status').style.display = 'none';
            
            const files = await window.electron.ipcRenderer.invoke('find-files', dirPath);
            if (files.length === 0) {
                showStatus('처리할 파일이 없습니다.', 'error');
                hideProgress();
                return;
            }
            
            const groups = await window.electron.ipcRenderer.invoke('group-files', files);
            if (Object.keys(groups).length === 0) {
                showStatus('중복된 파일이 없습니다.', 'info');
                hideProgress();
                return;
            }
            
            currentGroups = groups;
            displayGroups(groups);
            
            setTimeout(hideProgress, 1000);
            
        } catch (error) {
            showStatus(`오류 발생: ${error.message}`, 'error');
            hideProgress();
        } finally {
            isProcessing = false;
        }
    });

    // 진행 상황 업데이트 이벤트 리스너
    window.electron.ipcRenderer.on('progress-update', (progress) => {
        showProgress();
        
        const percent = progress.percent || 
                       (progress.total > 0 ? (progress.current / progress.total * 100) : 0);
        
        // 진행 단계에 따라 해당하는 진행바 업데이트
        switch (progress.type) {
            case 'search':
                updateProgressBar('search', percent, progress.details);
                break;
            case 'group':
                updateProgressBar('group', percent, progress.details);
                break;
        }
    });
}); 