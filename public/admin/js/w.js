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

const searchWithdraws = (e) => {
  e.preventDefault();
  const renderUsers = (userBody, news) => {
    news.forEach(({ withdrawId, user, amount, address, status, photoUrl, createdAt }) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
       <div class="border border-purple-600/20 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow duration-200 flex flex-col justify-between">
                <div class="flex justify-between items-start mb-4">
  
                  <div class="flex items-center space-x-4 min-w-0">
                    <img class="w-12 h-12 rounded-full border border-gray-200 flex-shrink-0" src="${photoUrl}" alt="User" />
                    <div class="min-w-0">
                      <p class="text-sm font-semibold text-gray-400 truncate">ID: ${withdrawId}</p></p>
                      <p class="text-xs text-gray-400">User:${user}</p>
                    </div>
                  </div>

                  <button onclick="openModal('${withdrawId}')" class="text-xs font-semibold text-purple-600 hover:text-purple-800 transition-colors duration-200 bg-purple-50 px-3 py-1 rounded whitespace-nowrap">
                    Update
                  </button>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 text-sm text-gray-700">
                  <div class="flex items-center space-x-2 overflow-hidden">
                    <div class="flex items-center space-x-1 truncate">
                      <img src="/shiba-inu.png" alt="logo" class="w-5 h-5 flex-shrink-0" />
                      <p class="font-medium truncate text-gray-400">Transfer</p>
                    </div>
                  </div>

                  <div class="flex items-center space-x-2">
                    <i class="fas fa-money-bill-wave text-purple-400 text-base"></i>
                    <p class="font-semibold text-gray-400">${amount} SHIB</p>
                  </div>

                  <div class="flex items-center space-x-2 overflow-hidden">
                    <i class="fas fa-map-marker-alt text-purple-400 text-base"></i>
                    <p class="truncate text-gray-400" title="">
                      ${address}
                    </p>
                    <button onclick="copyToClipboard('${address}',this)" class="text-purple-500 hover:text-purple-700" title="Copy">
                      <i class="fas fa-copy"></i>
                    </button>
                  </div>
                  <div class="flex flex-col items-end justify-between">
                    <span class="px-3 py-1 text-xs font-medium rounded-full whitespace-nowrap ${status === 'pending' ? 'text-yellow-800 bg-yellow-100' : status === 'completed' ? 'text-green-800 bg-green-100' : 'text-red-800 bg-red-100'}">
                      ${status}
                    </span>
                    <p class="text-xs text-gray-500 mt-1">${timeAgo(createdAt)}</p>
                  </div>
                </div>
              </div>
`;
      userBody.appendChild(tr);
    });
  };
  const userBody = document.getElementById('withdraws-list');
  userBody.innerHTML = '';
  const input = document.getElementById('searchWithdrawInput').value;
  if (!input || input === '') {
    return renderUsers(userBody, allWithdraws);
  };
  const news = allWithdraws.filter((u) => u.withdrawId?.toString().startsWith(input.toUpperCase()) || u.status.toString().startsWith(input));
  if (news.length === 0) {
    userBody.innerHTML = `
                  <p class="col-span-full text-gray-600 text-center">No withdrawal requests found.</p>`;
    return;
  } else {
    renderUsers(userBody, news);
  }
};

document.getElementById('searchWithdrawInput').addEventListener('input', searchWithdraws);
document.getElementById('searchWithdrawBtn').addEventListener('click', searchWithdraws);