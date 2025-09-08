const searchUser =  (e) => {
  e.preventDefault();
  const renderUsers = (userBody, news) => {
    
    news.forEach(({ user, name, username, balance, photoUrl }) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
            <td class="px-6 py-4 whitespace-nowrap">
              <div class="flex items-center">
                <img class="w-10 h-10 rounded-full" src="${photoUrl}" alt="User profile" loading="lazy" />
                <div class="ml-4">
                  <div class="text-sm font-medium text-gray-400">${name}</div>
                  <div class="text-sm text-gray-500">${user}</div>
                </div>
              </div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">@${username}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${balance} SHIB</td>
            <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
              <button onclick="openEditModal('${user}', '${username}', '${balance}')" class="text-purple-600 hover:text-purple-900 mr-3">
                <i class="fas fa-edit"></i>
                Edit
              </button>
            </td>
          </tr>
`;
      userBody.appendChild(tr);
    });
  };
  const userBody = document.getElementById('user-list');
  userBody.innerHTML = '';
  const input = document.getElementById('userUserInput').value;
  if (!input || input === '') {
    return renderUsers(userBody, allUsers);
  }
  const news = allUsers.filter((u) => u.user.toString().startsWith(input));
  if (news.length === 0) {
    userBody.innerHTML = `<tr>
            <td colspan="5" class="px-6 py-4 text-center text-sm text-gray-500">No users found
            </td>
          </tr>`;
    return;
  } else {
    renderUsers(userBody, news);
  }
};

document.getElementById('userUserInput').addEventListener('input', searchUser);
document.getElementById('searchUser').addEventListener('click', searchUser);