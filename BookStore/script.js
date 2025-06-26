let debounceTimer;

function debouncedSearch(func) {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(func, 500);
}

function searchBooks() {
  const query = document.getElementById("query")?.value;
  if (!query) return;

  const sort = document.getElementById("sort")?.value;
  const filter = document.getElementById("filter")?.value;

  if (!query.trim()) {
    document.getElementById("books").innerHTML = "<p class='error'>Please enter a search term.</p>";
    return;
  }

  let url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}`;
  if (sort) url += `&orderBy=${sort}`;
  if (filter) url += `&filter=${filter}`;

  document.getElementById("books").innerHTML = "<p>Loading...</p>";
  document.getElementById("preloader")?.classList.remove("hide");

  fetch(url)
    .then(res => res.json())
    .then(data => {
      document.getElementById("preloader")?.classList.add("hide");
      if (!data.items) {
        document.getElementById("books").innerHTML = "<p class='error'>No books found.</p>";
        return;
      }

      const booksHTML = data.items.map((item, index) => {
        const info = item.volumeInfo || {};
        const downloadLink = item.accessInfo?.pdf?.downloadLink || null;
        const bookInfo = {
          title: info.title || "Unknown Title",
          authors: info.authors || ["Unknown Author"],
          imageLinks: info.imageLinks || { thumbnail: "https://via.placeholder.com/128x192" },
          accessInfo: item.accessInfo || {}
        };
        return `
          <div class="card" style="animation-delay: ${index * 0.1}s">
            <img src="${bookInfo.imageLinks.thumbnail}" alt="${bookInfo.title}"/>
            <h3>${bookInfo.title}</h3>
            <p>${bookInfo.authors.join(", ")}</p>
            <div class="card-actions">
              <button onclick='readBook("${item.id}")' title="Read preview">📖 Read</button>
              ${downloadLink ? `<a href="${downloadLink}" target="_blank" class="download" title="Download eBook">📥 Download</a>` : ""}
              <button class="favorite" onclick='toggleFavorite("${item.id}", ${JSON.stringify(bookInfo)})' title="${isFavorite(item.id) ? "Remove from Favorites" : "Add to Favorites"}">
                ${isFavorite(item.id) ? "❤ Remove" : "❤ Favorite"}
              </button>
              <button class="readlater" onclick='toggleReadLater("${item.id}", ${JSON.stringify(bookInfo)})' title="${isReadLater(item.id) ? "Remove from Read Later" : "Add to Read Later"}">
                ${isReadLater(item.id) ? "⏰ Remove" : "⏰ Read Later"}
              </button>
            </div>
          </div>`;
      }).join("");

      document.getElementById("books").innerHTML = booksHTML;
    })
    .catch(error => {
      document.getElementById("preloader")?.classList.add("hide");
      document.getElementById("books").innerHTML = "<p class='error'>Error fetching books.</p>";
      console.error("Fetch error:", error);
    });
}

function readBook(bookId) {
  const reader = document.getElementById("reader");
  if (reader) {
    reader.innerHTML = `<iframe src="https://books.google.com/books?id=${bookId}&printsec=frontcover&output=embed"></iframe>`;
    reader.scrollIntoView({ behavior: "smooth" });
  }
}

function showFavorites() {
  const listDiv = document.getElementById("favoritesList");
  if (!listDiv) {
    console.error("favoritesList element not found");
    return;
  }

  let favs = {};
  try {
    favs = JSON.parse(localStorage.getItem("favorites") || "{}");
    console.log("Favorites loaded from localStorage:", favs);
  } catch (error) {
    console.error("Error parsing favorites from localStorage:", error);
    listDiv.innerHTML = "<p class='error'>Error loading favorites.</p>";
    return;
  }

  function renderList(items, filterText = "") {
    listDiv.innerHTML = "";
    const entries = Object.entries(items);
    console.log("Favorites entries to render:", entries);
    if (entries.length === 0) {
      listDiv.innerHTML = "<p class='error'>No favorites saved.</p>";
      return;
    }

    entries.forEach(([id, info], index) => {
      if (!info || !info.title) {
        console.warn(`Invalid favorite data for ID ${id}:`, info);
        return;
      }
      if (info.title.toLowerCase().includes(filterText.toLowerCase())) {
        const downloadLink = info.accessInfo?.pdf?.downloadLink || null;
        listDiv.innerHTML += `
          <div class="card" style="animation-delay: ${index * 0.1}s">
            <img src="${info.imageLinks?.thumbnail || 'https://via.placeholder.com/128x192'}" alt="${info.title}"/>
            <h3>${info.title}</h3>
            <p>${info.authors?.join(", ") || "Unknown Author"}</p>
            <div class="card-actions">
              <button onclick='readBook("${id}")' title="Read preview">📖 Read</button>
              ${downloadLink ? `<a href="${downloadLink}" target="_blank" class="download" title="Download eBook">📥 Download</a>` : ""}
              <button class="favorite" onclick='toggleFavorite("${id}", ${JSON.stringify(info)})' title="Remove from Favorites">
                ❤ Remove
              </button>
              <button class="readlater" onclick='toggleReadLater("${id}", ${JSON.stringify(info)})' title="${isReadLater(id) ? "Remove from Read Later" : "Add to Read Later"}">
                ${isReadLater(id) ? "⏰ Remove" : "⏰ Read Later"}
              </button>
            </div>
          </div>`;
      }
    });
  }

  renderList(favs);

  const searchInput = document.getElementById("favoritesSearch");
  if (searchInput) {
    searchInput.value = "";
    searchInput.oninput = function () {
      console.log("Filtering favorites with:", searchInput.value);
      renderList(favs, searchInput.value);
    };
  } else {
    console.warn("favoritesSearch input not found");
  }
}

function showReadLater() {
  const readLater = JSON.parse(localStorage.getItem("readLater") || "{}");
  const listDiv = document.getElementById("readLaterList");
  if (!listDiv) return;

  function renderList(items, filterText = "") {
    listDiv.innerHTML = "";
    const entries = Object.entries(items);
    if (entries.length === 0) {
      listDiv.innerHTML = "<p class='error'>No read later books saved.</p>";
      return;
    }

    entries.forEach(([id, info], index) => {
      if (!info || !info.title) return;
      if (info.title.toLowerCase().includes(filterText.toLowerCase())) {
        const downloadLink = info.accessInfo?.pdf?.downloadLink || null;
        listDiv.innerHTML += `
          <div class="card" style="animation-delay: ${index * 0.1}s">
            <img src="${info.imageLinks?.thumbnail || 'https://via.placeholder.com/128x192'}" alt="${info.title}"/>
            <h3>${info.title}</h3>
            <p>${info.authors?.join(", ") || "Unknown Author"}</p>
            <div class="card-actions">
              <button onclick='readBook("${id}")' title="Read preview">📖 Read</button>
              ${downloadLink ? `<a href="${downloadLink}" target="_blank" class="download" title="Download eBook">📥 Download</a>` : ""}
              <button class="favorite" onclick='toggleFavorite("${id}", ${JSON.stringify(info)})' title="${isFavorite(id) ? "Remove from Favorites" : "Add to Favorites"}">
                ${isFavorite(id) ? "❤ Remove" : "❤ Favorite"}
              </button>
              <button class="readlater" onclick='toggleReadLater("${id}", ${JSON.stringify(info)})' title="Remove from Read Later">
                ⏰ Remove
              </button>
            </div>
          </div>`;
      }
    });
  }

  renderList(readLater);

  const searchInput = document.getElementById("readLaterSearch");
  if (searchInput) {
    searchInput.value = "";
    searchInput.oninput = function () {
      renderList(readLater, searchInput.value);
    };
  }
}

function toggleFavorite(id, info) {
  try {
    let favs = JSON.parse(localStorage.getItem("favorites") || "{}");
    if (!id || !info || !info.title) {
      console.error("Invalid book ID or info:", { id, info });
      alert("Cannot add book to favorites: invalid data.");
      return;
    }
    if (favs[id]) {
      delete favs[id];
      console.log(`Removed book ${id} from favorites`);
    } else {
      favs[id] = info;
      console.log(`Added book ${id} to favorites`, info);
    }
    localStorage.setItem("favorites", JSON.stringify(favs));
    console.log("Favorites updated in localStorage:", favs);
    refreshPage();
  } catch (error) {
    console.error("Error toggling favorite:", error);
    alert("Error updating favorites. Please try again.");
  }
}

function isFavorite(id) {
  try {
    let favs = JSON.parse(localStorage.getItem("favorites") || "{}");
    return !!favs[id];
  } catch (error) {
    console.error("Error checking favorite:", error);
    return false;
  }
}

function toggleReadLater(id, info) {
  try {
    let readLater = JSON.parse(localStorage.getItem("readLater") || "{}");
    if (!id || !info || !info.title) {
      console.error("Invalid book ID or info:", { id, info });
      return;
    }
    if (readLater[id]) {
      delete readLater[id];
      console.log(`Removed book ${id} from read later`);
    } else {
      readLater[id] = info;
      console.log(`Added book ${id} to read later`);
    }
    localStorage.setItem("readLater", JSON.stringify(readLater));
    refreshPage();
  } catch (error) {
    console.error("Error toggling read later:", error);
    alert("Error updating read later. Please try again.");
  }
}

function isReadLater(id) {
  try {
    let readLater = JSON.parse(localStorage.getItem("readLater") || "{}");
    return !!readLater[id];
  } catch (error) {
    console.error("Error checking read later:", error);
    return false;
  }
}

function refreshPage() {
  if (document.getElementById("books")) searchBooks();
  else if (document.getElementById("readLaterList")) showReadLater();
  else if (document.getElementById("favoritesList")) showFavorites();
}

function toggleDark() {
  document.body.classList.toggle("dark");
}

function voiceSearch(inputId) {
  if (!('webkitSpeechRecognition' in window)) {
    alert("Voice search not supported in this browser.");
    return;
  }

  const recognition = new webkitSpeechRecognition();
  recognition.lang = "en-US";
  recognition.interimResults = false;

  recognition.onresult = function (event) {
    const transcript = event.results[0][0].transcript;
    const queryInput = document.getElementById(inputId);
    if (queryInput) {
      queryInput.value = transcript;
      if (inputId === "query") searchBooks();
    }
  };

  recognition.onerror = function (event) {
    alert("Voice recognition error: " + event.error);
  };

  recognition.start();
}

function toggleNav() {
  const navLinks = document.querySelector(".nav-links");
  navLinks.classList.toggle("active");
}

// Initialize
window.onload = () => {
  setTimeout(() => {
    document.getElementById("preloader")?.classList.add("hide");
  }, 1000);
  if (document.getElementById("query")) {
    document.getElementById("query").addEventListener("keydown", (e) => {
      if (e.key === "Enter") debouncedSearch(searchBooks);
    });
  }
  if (document.getElementById("favoritesList")) {
    console.log("Initializing favorites page");
    showFavorites();
  }
  if (document.getElementById("readLaterList")) showReadLater();
};