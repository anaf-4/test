// DOM Elements
const githubTokenInput = document.getElementById('githubToken');
const repoOwnerInput = document.getElementById('repoOwner');
const repoNameInput = document.getElementById('repoName');
const branchNameInput = document.getElementById('branchName');
const commitMessageInput = document.getElementById('commitMessage');
const dropZone = document.getElementById('dropZone');
const fileUploadBtn = document.getElementById('fileUploadBtn');
const folderUploadBtn = document.getElementById('folderUploadBtn');
const fileInput = document.getElementById('fileInput');
const folderInput = document.getElementById('folderInput');
const fileList = document.getElementById('fileList');
const fileListItems = document.getElementById('fileListItems');
const uploadSubmitBtn = document.getElementById('uploadSubmitBtn');
const hamburger = document.querySelector('.hamburger');
const navLinks = document.querySelector('.nav-links');

// State
let selectedFiles = [];
let selectedFileMap = new Map();

// Mobile Menu Toggle
hamburger.addEventListener('click', () => {
    navLinks.classList.toggle('active');
});

// Smooth scroll for nav links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            navLinks.classList.remove('active');
        }
    });
});

// File Upload Buttons
fileUploadBtn.addEventListener('click', () => fileInput.click());
folderUploadBtn.addEventListener('click', () => folderInput.click());

fileInput.addEventListener('change', (e) => handleFiles(e.target.files));
folderInput.addEventListener('change', (e) => handleFiles(e.target.files));

// Drag and Drop
dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('drag-over');
});

dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('drag-over');
});

dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('drag-over');
    handleFiles(e.dataTransfer.files);
});

// Handle Files
function handleFiles(files) {
    const newFiles = Array.from(files);
    newFiles.forEach(file => {
        const key = file.webkitRelativePath || file.name;
        selectedFileMap.set(key, file);
    });
    selectedFiles = Array.from(selectedFileMap.values());
    updateFileList();
}

// Update File List
function updateFileList() {
    if (selectedFiles.length > 0) {
        fileList.classList.add('active');
        fileListItems.innerHTML = '';
        
        selectedFiles.forEach((file, index) => {
            const li = document.createElement('li');
            const displayName = file.webkitRelativePath || file.name;
            li.innerHTML = `
                <div class="file-name">
                    <i class="fas fa-file"></i>
                    <span>${displayName}</span>
                </div>
                <div>
                    <span class="file-size">${formatFileSize(file.size)}</span>
                    <button class="remove-file" data-key="${file.webkitRelativePath || file.name}">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            `;
            fileListItems.appendChild(li);
        });
        
        document.querySelectorAll('.remove-file').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const key = e.currentTarget.dataset.key;
                selectedFileMap.delete(key);
                selectedFiles = Array.from(selectedFileMap.values());
                updateFileList();
            });
        });
        
        updateUploadButton();
    } else {
        fileList.classList.remove('active');
    }
}

// Format File Size
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Update Upload Button State
function updateUploadButton() {
    const hasFiles = selectedFiles.length > 0;
    const hasToken = githubTokenInput.value.trim() !== '';
    const hasOwner = repoOwnerInput.value.trim() !== '';
    const hasRepo = repoNameInput.value.trim() !== '';
    const hasBranch = branchNameInput.value.trim() !== '';
    const hasCommitMsg = commitMessageInput.value.trim() !== '';
    
    uploadSubmitBtn.disabled = !(hasFiles && hasToken && hasOwner && hasRepo && hasBranch && hasCommitMsg);
}

// Listen for input changes
[githubTokenInput, repoOwnerInput, repoNameInput, branchNameInput, commitMessageInput].forEach(input => {
    input.addEventListener('input', updateUploadButton);
});

// Upload Submit
uploadSubmitBtn.addEventListener('click', async () => {
    const token = githubTokenInput.value.trim();
    const owner = repoOwnerInput.value.trim();
    const repo = repoNameInput.value.trim();
    const branch = branchNameInput.value.trim();
    const message = commitMessageInput.value.trim();
    
    if (!token) {
        showNotification('GitHub 토큰을 입력해주세요.', 'error');
        return;
    }
    
    if (!owner || !repo) {
        showNotification('저장소 소유자와 이름을 입력해주세요.', 'error');
        return;
    }
    
    if (!branch) {
        showNotification('브랜치 이름을 입력해주세요.', 'error');
        return;
    }
    
    if (!message) {
        showNotification('커밋 메시지를 입력해주세요.', 'error');
        return;
    }
    
    if (selectedFiles.length === 0) {
        showNotification('파일을 선택해주세요.', 'error');
        return;
    }
    
    uploadSubmitBtn.disabled = true;
    uploadSubmitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 업로드 중...';
    
    let successCount = 0;
    let failCount = 0;
    
    try {
        for (const file of selectedFiles) {
            const path = file.webkitRelativePath || file.name;
            const success = await uploadFileToGitHub(token, owner, repo, branch, message, file, path);
            if (success) {
                successCount++;
            } else {
                failCount++;
            }
        }
        
        if (failCount === 0) {
            showNotification(`${successCount}개의 파일이 성공적으로 업로드되었습니다!`, 'success');
        } else {
            showNotification(`${successCount}개 성공, ${failCount}개 실패`, 'error');
        }
        
        if (successCount > 0) {
            selectedFiles = [];
            selectedFileMap.clear();
            updateFileList();
            commitMessageInput.value = '';
            updateUploadButton();
        }
    } catch (error) {
        showNotification(`업로드 중 오류가 발생했습니다: ${error.message}`, 'error');
    } finally {
        uploadSubmitBtn.innerHTML = '<i class="fas fa-upload"></i> 업로드 시작';
        updateUploadButton();
    }
});

// Upload single file to GitHub
async function uploadFileToGitHub(token, owner, repo, branch, message, file, path) {
    const content = await readFileAsBase64(file);
    
    // Check if file already exists to get SHA
    let sha = null;
    try {
        const checkResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${branch}`, {
            method: 'GET',
            headers: {
                'Authorization': `token ${token}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });
        
        if (checkResponse.ok) {
            const existingFile = await checkResponse.json();
            sha = existingFile.sha;
        }
    } catch (e) {
        // File doesn't exist, that's fine
    }
    
    const body = {
        message: message,
        content: content,
        branch: branch
    };
    
    if (sha) {
        body.sha = sha;
    }
    
    const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, {
        method: 'PUT',
        headers: {
            'Authorization': `token ${token}`,
            'Accept': 'application/vnd.github.v3+json',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
    });
    
    if (response.ok) {
        return true;
    } else {
        const error = await response.json();
        showNotification(`${path} 업로드 실패: ${error.message}`, 'error');
        return false;
    }
}

// Read file as Base64
function readFileAsBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            // Remove data URL prefix
            const base64 = reader.result.split(',')[1];
            resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

// Notification System
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
        <span>${message}</span>
    `;
    
    Object.assign(notification.style, {
        position: 'fixed',
        top: '100px',
        right: '20px',
        padding: '15px 25px',
        background: type === 'success' ? 'var(--success)' : type === 'error' ? 'var(--danger)' : 'var(--primary)',
        color: 'white',
        borderRadius: 'var(--radius-sm)',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        zIndex: '10000',
        boxShadow: 'var(--shadow)',
        animation: 'slideIn 0.3s ease'
    });
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Add notification animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// Navbar scroll effect
window.addEventListener('scroll', () => {
    const navbar = document.querySelector('.navbar');
    if (window.scrollY > 50) {
        navbar.style.background = 'rgba(15, 23, 42, 0.98)';
    } else {
        navbar.style.background = 'rgba(15, 23, 42, 0.9)';
    }
});

// Intersection Observer for animations
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
        }
    });
}, observerOptions);

document.querySelectorAll('.feature-card, .step, .tech-card').forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(30px)';
    el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
    observer.observe(el);
});
