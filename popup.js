// 书签数据
let allBookmarks = [];
let classifiedBookmarks = {};

// DOM元素
const loadBookmarksBtn = document.getElementById('loadBookmarksBtn');
const classifyBtn = document.getElementById('classifyBtn');
const checkAccessibilityBtn = document.getElementById('checkAccessibilityBtn');
const bookmarkList = document.getElementById('bookmarkList');
const bookmarkCount = document.getElementById('bookmarkCount');
const actionSection = document.getElementById('actionSection');
const classifyStatus = document.getElementById('classifyStatus');
const checkStatus = document.getElementById('checkStatus');
const classifiedResults = document.getElementById('classifiedResults');
const inaccessibleBookmarks = document.getElementById('inaccessibleBookmarks');
const progressBar = document.getElementById('progressBar');
const progressFill = document.getElementById('progressFill');
const settingsBtn = document.getElementById('settingsBtn');

// 标签页切换
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    
    tab.classList.add('active');
    const tabName = tab.dataset.tab;
    document.getElementById(`${tabName}Tab`).classList.add('active');
  });
});

// 加载书签
loadBookmarksBtn.addEventListener('click', async () => {
  try {
    loadBookmarksBtn.disabled = true;
    loadBookmarksBtn.textContent = '加载中...';
    
    const bookmarks = await chrome.bookmarks.getTree();
    allBookmarks = flattenBookmarks(bookmarks);
    
    bookmarkCount.textContent = `已加载 ${allBookmarks.length} 个书签`;
    displayBookmarks(allBookmarks);
    actionSection.style.display = 'block';
    
    loadBookmarksBtn.disabled = false;
    loadBookmarksBtn.textContent = '📖 加载书签';
  } catch (error) {
    showStatus(classifyStatus, `错误: ${error.message}`, 'error');
    loadBookmarksBtn.disabled = false;
    loadBookmarksBtn.textContent = '📖 加载书签';
  }
});

// 扁平化书签树
function flattenBookmarks(bookmarks, result = []) {
  for (const bookmark of bookmarks) {
    if (bookmark.url) {
      result.push({
        id: bookmark.id,
        title: bookmark.title,
        url: bookmark.url
      });
    }
    if (bookmark.children) {
      flattenBookmarks(bookmark.children, result);
    }
  }
  return result;
}

// 显示书签列表
function displayBookmarks(bookmarks) {
  if (bookmarks.length === 0) {
    bookmarkList.innerHTML = '<div class="empty-state">暂无书签</div>';
    return;
  }
  
  bookmarkList.innerHTML = bookmarks.slice(0, 50).map(bookmark => `
    <div class="bookmark-item">
      <div class="bookmark-title">${escapeHtml(bookmark.title)}</div>
      <div class="bookmark-url">${escapeHtml(bookmark.url)}</div>
    </div>
  `).join('');
  
  if (bookmarks.length > 50) {
    bookmarkList.innerHTML += `<div style="text-align: center; padding: 10px; color: #666;">还有 ${bookmarks.length - 50} 个书签...</div>`;
  }
}

// AI分类整理
classifyBtn.addEventListener('click', async () => {
  if (allBookmarks.length === 0) {
    showStatus(classifyStatus, '请先加载书签', 'error');
    return;
  }
  
  try {
    classifyBtn.disabled = true;
    classifyBtn.textContent = '分类中...';
    showStatus(classifyStatus, '正在使用AI进行分类，请稍候...', 'info');
    
    const apiKey = await getApiKey();
    if (!apiKey) {
      showStatus(classifyStatus, '请先在设置中配置DeepSeek API密钥', 'error');
      classifyBtn.disabled = false;
      classifyBtn.textContent = '🤖 AI分类整理';
      return;
    }
    
    // 分批处理书签（避免一次性发送太多）
    const batchSize = 20;
    const batches = [];
    for (let i = 0; i < allBookmarks.length; i += batchSize) {
      batches.push(allBookmarks.slice(i, i + batchSize));
    }
    
    classifiedBookmarks = {};
    
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      showStatus(classifyStatus, `正在分类第 ${i + 1}/${batches.length} 批...`, 'info');
      
      const categories = await classifyBookmarks(batch, apiKey);
      
      // 合并分类结果
      for (const [category, bookmarks] of Object.entries(categories)) {
        if (!classifiedBookmarks[category]) {
          classifiedBookmarks[category] = [];
        }
        classifiedBookmarks[category].push(...bookmarks);
      }
    }
    
    displayClassifiedResults();
    showStatus(classifyStatus, '分类完成！', 'success');
    classifyBtn.disabled = false;
    classifyBtn.textContent = '🤖 AI分类整理';
  } catch (error) {
    showStatus(classifyStatus, `分类失败: ${error.message}`, 'error');
    classifyBtn.disabled = false;
    classifyBtn.textContent = '🤖 AI分类整理';
  }
});

// 调用DeepSeek API进行分类
async function classifyBookmarks(bookmarks, apiKey) {
  const prompt = `请对这些书签进行分类整理。根据网址和标题，将它们按照用途、类型等分类。
  
书签列表：
${bookmarks.map((b, i) => `${i + 1}. ${b.title} - ${b.url}`).join('\n')}

请返回JSON格式，格式如下：
{
  "分类名称1": [
    {"title": "书签标题", "url": "书签URL"}
  ],
  "分类名称2": [
    {"title": "书签标题", "url": "书签URL"}
  ]
}

只返回JSON，不要其他文字。`;

  try {
    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7
      })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'API请求失败');
    }
    
    const data = await response.json();
    const content = data.choices[0].message.content.trim();
    
    // 提取JSON（可能包含markdown代码块）
    let jsonStr = content;
    if (content.includes('```')) {
      const match = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (match) {
        jsonStr = match[1];
      }
    }
    
    const categories = JSON.parse(jsonStr);
    return categories;
  } catch (error) {
    console.error('分类错误:', error);
    throw error;
  }
}

// 显示分类结果
function displayClassifiedResults() {
  if (Object.keys(classifiedBookmarks).length === 0) {
    classifiedResults.innerHTML = '<div class="empty-state">暂无分类结果</div>';
    return;
  }
  
  let html = '';
  for (const [category, bookmarks] of Object.entries(classifiedBookmarks)) {
    html += `
      <div class="result-section">
        <h3>${escapeHtml(category)} (${bookmarks.length})</h3>
        <div class="bookmark-list">
          ${bookmarks.map(bookmark => `
            <div class="bookmark-item">
              <div class="bookmark-title">${escapeHtml(bookmark.title)}</div>
              <div class="bookmark-url">${escapeHtml(bookmark.url)}</div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }
  
  classifiedResults.innerHTML = html;
}

// 检测书签可访问性
checkAccessibilityBtn.addEventListener('click', async () => {
  if (allBookmarks.length === 0) {
    showStatus(checkStatus, '请先加载书签', 'error');
    return;
  }
  
  try {
    checkAccessibilityBtn.disabled = true;
    checkAccessibilityBtn.textContent = '检测中...';
    progressBar.style.display = 'block';
    showStatus(checkStatus, '正在检测书签可访问性...', 'info');
    
    const inaccessible = [];
    const total = allBookmarks.length;
    let checked = 0;
    
    // 并发控制：同时最多检测3个
    const concurrency = 3;
    const checkPromises = [];
    
    for (let i = 0; i < allBookmarks.length; i += concurrency) {
      const batch = allBookmarks.slice(i, i + concurrency);
      const batchPromises = batch.map(async (bookmark) => {
        const isAccessible = await checkBookmarkAccessibility(bookmark.url);
        checked++;
        const progress = (checked / total) * 100;
        progressFill.style.width = `${progress}%`;
        
        if (!isAccessible) {
          inaccessible.push(bookmark);
        }
        
        // 更新状态
        if (checked % 5 === 0 || checked === total) {
          showStatus(checkStatus, `已检测 ${checked}/${total} 个书签，发现 ${inaccessible.length} 个不可访问`, 'info');
        }
      });
      
      await Promise.all(batchPromises);
    }
    
    displayInaccessibleBookmarks(inaccessible);
    showStatus(checkStatus, `检测完成！发现 ${inaccessible.length} 个不可访问的书签`, inaccessible.length > 0 ? 'error' : 'success');
    
    checkAccessibilityBtn.disabled = false;
    checkAccessibilityBtn.textContent = '🔍 检测书签可访问性';
    progressBar.style.display = 'none';
  } catch (error) {
    showStatus(checkStatus, `检测失败: ${error.message}`, 'error');
    checkAccessibilityBtn.disabled = false;
    checkAccessibilityBtn.textContent = '🔍 检测书签可访问性';
    progressBar.style.display = 'none';
  }
});

// 检测单个书签的可访问性
async function checkBookmarkAccessibility(url) {
  return new Promise((resolve) => {
    // 先检查URL格式
    try {
      new URL(url);
    } catch (e) {
      resolve(false);
      return;
    }
    
    // 使用tabs API创建标签页来检测
    chrome.tabs.create({ 
      url: url, 
      active: false 
    }, (tab) => {
      if (chrome.runtime.lastError) {
        resolve(false);
        return;
      }
      
      let timeoutId;
      let checkCount = 0;
      const maxChecks = 6; // 最多检查6次（3秒）
      
      // 等待页面加载
      const checkTab = () => {
        checkCount++;
        chrome.tabs.get(tab.id, (tabInfo) => {
          if (chrome.runtime.lastError) {
            // 标签页已关闭，可能是无效链接
            clearTimeout(timeoutId);
            resolve(false);
            return;
          }
          
          // 检查是否是错误页面
          if (tabInfo.url && (
            tabInfo.url.includes('chrome-error://') ||
            tabInfo.url.includes('chrome://') && !tabInfo.url.startsWith('chrome-extension://')
          )) {
            clearTimeout(timeoutId);
            chrome.tabs.remove(tab.id, () => {
              resolve(false);
            });
            return;
          }
          
          // 如果URL已经改变（可能是重定向），检查最终URL
          if (tabInfo.status === 'complete') {
            clearTimeout(timeoutId);
            const finalUrl = tabInfo.url;
            // 如果最终URL是有效的，认为是可访问的
            if (finalUrl && !finalUrl.includes('chrome-error://') && 
                (!finalUrl.includes('chrome://') || finalUrl.startsWith('chrome-extension://'))) {
              chrome.tabs.remove(tab.id, () => {
                resolve(true);
              });
            } else {
              chrome.tabs.remove(tab.id, () => {
                resolve(false);
              });
            }
          } else if (tabInfo.status === 'loading' && checkCount < maxChecks) {
            // 还在加载，继续等待
            setTimeout(checkTab, 500);
          } else {
            // 超时或其他状态
            clearTimeout(timeoutId);
            chrome.tabs.remove(tab.id, () => {
              resolve(false);
            });
          }
        });
      };
      
      // 设置超时（3秒）
      timeoutId = setTimeout(() => {
        chrome.tabs.get(tab.id, (tabInfo) => {
          if (tabInfo) {
            chrome.tabs.remove(tab.id, () => {
              resolve(false);
            });
          } else {
            resolve(false);
          }
        });
      }, 3000);
      
      // 开始检测
      setTimeout(checkTab, 500);
    });
  });
}

// 显示不可访问的书签
function displayInaccessibleBookmarks(bookmarks) {
  if (bookmarks.length === 0) {
    inaccessibleBookmarks.innerHTML = '<div class="empty-state">所有书签都可以正常访问！</div>';
    return;
  }
  
  inaccessibleBookmarks.innerHTML = `
    <div class="result-section">
      <h3>不可访问的书签 (${bookmarks.length})</h3>
      <div class="bookmark-list">
        ${bookmarks.map(bookmark => `
          <div class="bookmark-item inaccessible">
            <div class="bookmark-title">${escapeHtml(bookmark.title)}</div>
            <div class="bookmark-url">${escapeHtml(bookmark.url)}</div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

// 工具函数
function showStatus(element, message, type) {
  element.textContent = message;
  element.className = `status-text ${type}`;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

async function getApiKey() {
  const result = await chrome.storage.sync.get(['deepseekApiKey']);
  return result.deepseekApiKey;
}

// 打开设置页面
settingsBtn.addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
});

