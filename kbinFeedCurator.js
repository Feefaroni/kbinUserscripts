// ==UserScript==
// @name         kbin Feed Curator
// @version      0.1
// @namespace    https://greasyfork.org/users/19234
// @description  Hides posts with Reddit-related keywords from the main feed.
// @author       fiofiofio
// @match        https://kbin.social/*
// @match        https://fedia.io/*
// @match        https://karab.in/*
// @match        https://www.kbin.cafe/*
// @match        https://karab.in/*
// @match        https://readit.buzz/*
// @match        https://forum.fail/*
// @match        https://fedi196.gay/*
// @match        https://feddit.online/*
// @match        https://kbin.run/*
// @match        https://nadajnik.org/*
// @match        https://kbin.cafe/*
// @match        https://kbin.lol/*
// @match        https://nerdbin.social/*
// @match        https://kbin.lgbt/*
// @match        https://kbin.place/*
// @match        https://kopnij.in/*
// @match        https://kbin.sh/*
// @match        https://kayb.ee/*
// @match        https://wiku.hu/*
// @match        https://kbin.chat/*
// @match        https://fediverse.boo/*
// @match        https://tuna.cat/*
// @match        https://kbin.dk/*
// @grant        GM_log
// @require      https://github.com/Oricul/kbin-scripts/raw/main/kbin-mod-options.js
// @license      MIT
// ==/UserScript==

(function() {
  var blacklist = JSON.parse(localStorage.getItem('blacklist')) || [];

  const style = document.createElement('style');
  style.textContent = `
    .hide-post {padding:.5rem 2rem;}
    .hidden-note {margin-top:1rem; font-style:italic}
  `;
  document.head.appendChild(style);

  // Settings
  const feedCuratorHeader = kmoAddHeader(
    'kbin Feed Curator',
    {
      author: 'fiofiofio',
      version: '0.1',
      license: 'MIT',
      url: 'https://greasyfork.org/users/19234'
    }
  );

  const placeholderToggle = kmoAddToggle(
    feedCuratorHeader,
    'Show post placeholder?',
    true,
    'Show or hide the placeholder for blocked posts.'
  );

  const blacklistButton = kmoAddButton(
    feedCuratorHeader,
    'Blacklist',
    'Edit',
    'Open blacklist editor.'
  );

  // Save toggle state when clicked
  placeholderToggle.addEventListener('click', () => {
    localStorage.setItem('placeholderToggle', placeholderToggle.checked);
  });

  var toggleValue = localStorage.getItem('placeholderToggle');
  if (toggleValue !== null) {
    placeholderToggle.checked = JSON.parse(toggleValue);
  }

  // Open the blacklist editor when the button is clicked
  blacklistButton.addEventListener('click', function() {
    createBlacklistDialog();
    document.getElementById("blacklistDialog").showModal();
  });

  function createBlacklistDialog() {
    const modalDiv = document.createElement('dialog');
    modalDiv.id = "blacklistDialog";

    // Generate a list of current blacklist words
    const blacklistItems = blacklist.map(word => `<li>${word} <button class="remove-button" data-word="${word}">Remove</button></li>`).join('');

    modalDiv.innerHTML = `
      <form id="blacklistForm">
        <p>Current blacklist:</p>
        <ul id="blacklistItems">${blacklistItems}</ul>
        <label for="blacklistInput">Enter words to add to the blacklist (comma-separated):</label>
        <input type="text" id="blacklistInput" required>
        <div class="buttons">
          <button type="submit">Update Blacklist</button>
          <button type="button" id="cancelButton">Cancel</button>
        </div>
      </form>`;
    document.body.appendChild(modalDiv);

    const form = modalDiv.querySelector('#blacklistForm');
    const input = modalDiv.querySelector('#blacklistInput');
    const buttons = modalDiv.querySelector('.buttons');
    const cancelButton = modalDiv.querySelector('#cancelButton');
    const removeButtons = modalDiv.querySelectorAll('.remove-button');

    // Add CSS styles to the dialog element
    modalDiv.style.backgroundColor = 'var(--kbin-primary-color)';
    modalDiv.style.color = 'var(--kbin-text-color)';
    modalDiv.style.fontFamily = 'var(--kbin-body-font-family)';
    modalDiv.style.border = 'var(--kbin-section-border)';

    removeButtons.forEach(button => {
      button.style.backgroundColor = 'var(--kbin-vote-bg)';
      button.style.color = 'var(--kbin-vote-text-color)';
      button.style.marginLeft = 'var(--kbin-entry-element-spacing)';
      button.style.padding = '2px';
      button.style.border = 'var(--kbin-section-border)';
    });

    buttons.querySelectorAll("button").forEach(button => {
      button.style.backgroundColor = 'var(--kbin-vote-bg)';
      button.style.color = 'var(--kbin-vote-text-color)';
      button.style.margin = 'var(--kbin-entry-element-spacing)';
      button.style.marginLeft = '0';
      button.style.padding = '10px';
      button.style.border = 'var(--kbin-section-border)'
    });

    form.addEventListener('submit', function(event) {
      event.preventDefault();
      var userInput = input.value;
      var userWords = userInput.split(',').map(word => word.trim());

      blacklist = blacklist.concat(userWords);
      localStorage.setItem('blacklist', JSON.stringify(blacklist));

      modalDiv.close();
      location.reload();
    });

    cancelButton.addEventListener('click', function() {
      modalDiv.close();
    });

    removeButtons.forEach(button => {
      button.addEventListener('click', function() {
        const wordToRemove = button.dataset.word;
        blacklist = blacklist.filter(word => word !== wordToRemove);
        localStorage.setItem('blacklist', JSON.stringify(blacklist));
        modalDiv.remove();
        createBlacklistDialog();
        document.getElementById("blacklistDialog").showModal();
      });
    });
  }

  function hidePosts() {
    document.querySelectorAll("article").forEach(article => {
      const header = article.getElementsByTagName("header")[0]?.textContent;
      const description = article.getElementsByClassName("short-desc")[0]?.textContent;
      const magazineName = article.querySelector('.magazine-inline')?.getAttribute('title')?.toLowerCase();

      if (checkText(header) || checkText(description) || checkMagazineName(magazineName)) {
        if (placeholderToggle.checked) {
          let keywords = checkText(header)?.join(", ") || checkText(description)?.join(", ") || magazineName;
          const noteClassName = "hidden-note";
          article.classList.add("hide-post");
          article.classList.remove("entry");
          article.innerHTML = `<p class="${noteClassName}">Post hidden containing keywords: ${keywords}</p>`;
        } else {
          article.style.display = "none";
        }
      }
    });
  }

  function checkText(string) {
    const matchedWords = blacklist.filter(word => string?.toLowerCase().includes(word.toLowerCase()));
    return matchedWords.length > 0 ? matchedWords : null;
  }

  function checkMagazineName(string) {
    return blacklist.some(word => {
      const wordRegex = new RegExp(`\\b${word}\\b`, 'i');
      return wordRegex.test(string);
    });
  }

  // Wait for the document to load
  window.addEventListener('load', function() {
    hidePosts();
  });
})();
