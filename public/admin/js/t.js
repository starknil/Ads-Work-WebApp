function timeAgo(createdAt) {
  createdAt = new Date(createdAt);
  const now = new Date();
  const diffMs = now - createdAt;
  const seconds = Math.floor(diffMs / 1000);
  if (seconds < 60) return `${seconds} second${seconds !== 1 ? 's' : ''} ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} day${days !== 1 ? 's' : ''} ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} month${months !== 1 ? 's' : ''} ago`;
  const years = Math.floor(months / 12);
  return `${years} year${years !== 1 ? 's' : ''} ago`;
}

const searchUser = (e) => {
  e.preventDefault();
  const renderUsers = (userBody, news) => {
    news.forEach(({ taskId, type, username, reward, createdAt }) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
           <tr>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${taskId}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${type === 'tg'? 'Telegram' : 'Website'}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-500">
                      ${username}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${reward}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${timeAgo(createdAt)}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button onclick="openAddModal('edit', '${taskId}' ,'${username}', '${reward}', '${type}')" class="text-purple-600 hover:text-purple-900 mr-3">
                        <i class="fas fa-edit"></i>
                        Edit
                      </button>
                      <a href="/admin/task?type=delete&id=${taskId}" onclick="return confirm('Are you sure you want to delete this task?')" class="text-red-600 hover:text-red-900">
                        <i class="fas fa-trash"></i>
                        Delete
                      </a>
                    </td>
                  </tr>
`;
      userBody.appendChild(tr);
    });
  };
  const userBody = document.getElementById('task-list');
  userBody.innerHTML = '';
  const input = document.getElementById('findTaskInput').value;
  if (!input || input === '') {
    return renderUsers(userBody, allTasks);
  }
  const news = allTasks.filter((u) => u.taskId.toString().startsWith(input) || u.username.toString().startsWith(input));
  if (news.length === 0) {
    userBody.innerHTML = `<tr>
            <td colspan="5" class="px-6 py-4 text-center text-sm text-gray-500">No tasks found
            </td>
          </tr>`;
    return;
  } else {
    renderUsers(userBody, news);
  }
};

document.getElementById('findTaskInput').addEventListener('input', searchUser);
document.getElementById('findTaskBtn').addEventListener('click', searchUser);
