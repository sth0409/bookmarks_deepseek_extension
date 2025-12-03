// 设置页面脚本
const apiKeyInput = document.getElementById('apiKey');
const toggleVisibilityBtn = document.getElementById('toggleVisibility');
const saveBtn = document.getElementById('saveBtn');
const saveStatus = document.getElementById('saveStatus');

// 加载已保存的API密钥
chrome.storage.sync.get(['deepseekApiKey'], (result) => {
  if (result.deepseekApiKey) {
    apiKeyInput.value = result.deepseekApiKey;
  }
});

// 切换显示/隐藏
let isVisible = false;
toggleVisibilityBtn.addEventListener('click', () => {
  isVisible = !isVisible;
  apiKeyInput.type = isVisible ? 'text' : 'password';
  toggleVisibilityBtn.textContent = isVisible ? '🙈' : '👁️';
});

// 保存设置
saveBtn.addEventListener('click', async () => {
  const apiKey = apiKeyInput.value.trim();
  
  if (!apiKey) {
    showStatus('请输入 API 密钥', 'error');
    return;
  }
  
  try {
    await chrome.storage.sync.set({ deepseekApiKey: apiKey });
    showStatus('设置已保存！', 'success');
  } catch (error) {
    showStatus(`保存失败: ${error.message}`, 'error');
  }
});

function showStatus(message, type) {
  saveStatus.textContent = message;
  saveStatus.className = `status-text ${type} show`;
  
  setTimeout(() => {
    saveStatus.classList.remove('show');
  }, 3000);
}

