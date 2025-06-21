const filmListEl = document.getElementById('film-list');
const filmDetailEl = document.getElementById('film-detail');
const backButton = document.getElementById('back-button');
const detailTitle = document.getElementById('detail-title');
const detailImage = document.getElementById('detail-image');
const detailDescription = document.getElementById('detail-description');
const reviewsList = document.getElementById('reviews-list');
const reviewForm = document.getElementById('review-form');
const reviewText = document.getElementById('review-text');
const reviewRating = document.getElementById('review-rating');


const filterCategoryEl = document.getElementById('filter-category');
const sortRatingEl = document.getElementById('sort-rating');

let filmy = [];
let currentFilmId = null;

// Wczytaj filmy z serwera
async function loadFilmy() {
  try {
    const res = await fetch('data/filmy.json');
    filmy = await res.json();
    renderFilmList();
  } catch (e) {
    console.error('Błąd ładowania filmów:', e);
  }
}

function renderFilmList() {
  filmListEl.innerHTML = '';
  filmDetailEl.style.display = 'none';
  filmListEl.style.display = 'flex';

  const selectedCategory = filterCategoryEl.value;
  const sortOrder = sortRatingEl.value;

  filterCategoryEl.addEventListener('change', renderFilmList);
  sortRatingEl.addEventListener('change', renderFilmList);

  // Tworzymy nową tablicę filmów z obliczoną średnią oceną
  let filmsToShow = filmy.map(film => {
    const reviews = JSON.parse(localStorage.getItem('reviews_' + film.id)) || [];
    const avgRating = reviews.length
      ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length)
      : null; 
    return {...film, avgRating};
  });

  // Filtruj po kategorii (jeśli nie 'all')
  if (selectedCategory !== 'all') {
    filmsToShow = filmsToShow.filter(film => 
      film.kategoria.toLowerCase() === selectedCategory.toLowerCase()
    );
  }

  // Sortuj wg oceny (nully na końcu)
  filmsToShow.sort((a, b) => {
    if (a.avgRating === null) return 1;
    if (b.avgRating === null) return -1;
    return sortOrder === 'asc' ? a.avgRating - b.avgRating : b.avgRating - a.avgRating;
  });

  // Renderuj posortowane i przefiltrowane filmy
  filmsToShow.forEach(film => {
    const avgRatingDisplay = film.avgRating !== null ? film.avgRating.toFixed(1) : '–';

    const col = document.createElement('div');
    col.className = 'col-12 col-md-3';
    col.innerHTML = `
      <div class="card h-100" style="cursor:pointer;">
        <img src="${film.zdjecie}" class="card-img-top img-fluid" style="height:300px; object-fit:cover;" />
        <div class="card-body">
          <h5 class="card-title">${film.tytul}</h5>
          <p class="text-muted mb-1" style="font-size: 0.9rem;">${film.typ}, ${film.kategoria}</p>
          <p>Średnia ocena: ${avgRatingDisplay}</p>
        </div>
      </div>
    `;
    col.addEventListener('click', () => showFilmDetail(film.id));
    filmListEl.appendChild(col);
  });
}




// Pokaż szczegóły filmu i opinie
async function showFilmDetail(filmId) {
  currentFilmId = filmId;
  filmListEl.style.display = 'none';
  filmDetailEl.style.display = 'block';

  const film = filmy.find(f => f.id === filmId);
  if (!film) return;

  // Ustaw rok i czas trwania
  document.getElementById('detail-rok').textContent = film.rok || 'Brak danych';
  document.getElementById('detail-czas').textContent = film.czas || 'Brak danych';

  // Funkcja do otwierania modala i ładowania Wikipedii w iframe
  const wikiModal = new bootstrap.Modal(document.getElementById('wikiModal'));
  const wikiModalBody = document.getElementById('wikiModalBody').querySelector('iframe');

  function openWikiModal(url) {
    wikiModalBody.src = url;
    wikiModal.show();
  }




  // Ustaw reżysera (nazwa jako "klikany" link otwierający modal)
  const rezyserEl = document.getElementById('detail-rezyser');
  if (film.rezyser && film.rezyser.nazwa && film.rezyser.wiki) {
    rezyserEl.textContent = film.rezyser.nazwa;
    rezyserEl.href = '#';                // href na #, żeby nie przeładowywać
    rezyserEl.style.cursor = 'pointer'; // kursor zmienia się na wskazujący kliknięcie
    rezyserEl.onclick = (e) => {
      e.preventDefault();
      openWikiModal(film.rezyser.wiki);
    };
  } else {
    rezyserEl.textContent = 'Brak danych';
    rezyserEl.removeAttribute('href');
    rezyserEl.style.cursor = 'default';
    rezyserEl.onclick = null;
  }

  // Ustaw obsadę (lista z linkami otwierającymi modal)
  const roleEl = document.getElementById('detail-role');
  roleEl.innerHTML = ''; // wyczyść starą zawartość
  if (Array.isArray(film.role) && film.role.length > 0) {
    film.role.forEach(actor => {
      const li = document.createElement('li');
      const a = document.createElement('a');

      // Styl i zachowanie linka
      a.href = '#'; // zapobiegamy przeładowaniu
      a.style.cursor = 'pointer';
      a.textContent = actor.nazwa;
      a.classList.add('text-primary', 'text-decoration-none'); // niebieski link bez podkreślenia

      // Brak efektu hover (żadne podkreślenie)
      // Nie dodajemy żadnych eventListenerów na mouseenter/mouseleave

      // Obsługa kliknięcia – otwieranie modala
      a.onclick = (e) => {
        e.preventDefault();
        openWikiModal(actor.wiki);
      };

      li.appendChild(a);
      roleEl.appendChild(li);
    });
  } 
  else {
    roleEl.innerHTML = '<li>Brak danych</li>';
  }




  detailTitle.textContent = film.tytul;
  document.getElementById('detail-meta').textContent = `${film.typ}, ${film.kategoria}`;

  detailImage.src = film.zdjecie;
  detailDescription.textContent = 'Ładuję opis...';

  // Pobierz opis z pliku tekstowego
  try {
    const res = await fetch('data/' + film.opisPlik);
    const text = await res.text();
    detailDescription.textContent = text;
  } catch {
    detailDescription.textContent = 'Brak opisu filmu.';
  }


  document.getElementById('trailer-frame').src = film.trailer;

  document.getElementById("polecane-kategoria").textContent = film.kategoria;

  const polecane = filmy
    .filter(f => f.kategoria === film.kategoria && f.id !== film.id)
    .map(f => {
      const reviews = JSON.parse(localStorage.getItem('reviews_' + f.id)) || [];
      const avgRating = reviews.length ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length) : null;
      return { ...f, avgRating };
    });

  const carouselInner = document.getElementById("related-carousel-inner");
  carouselInner.innerHTML = '';

  // Grupa po 3 filmy na slajd
  for (let i = 0; i < polecane.length; i += 3) {
    const slideItems = polecane.slice(i, i + 3);

    const item = document.createElement('div');
    item.className = `carousel-item${i === 0 ? ' active' : ''}`;
    item.innerHTML = `
      <div class="container">
        <div class="row justify-content-center gx-3">
          ${slideItems.map(f => `
            <div class="col-12 col-md-4 mb-3">
              <div class="card h-100" style="cursor:pointer;">
                <img src="${f.zdjecie}" class="card-img-top" style="height: 250px; object-fit: cover;">
                <div class="card-body text-center">
                  <h6 class="card-title">${f.tytul}</h6>
                  <p class="mb-0 text-muted" style="font-size: 0.9rem;">
                    Średnia ocena: ${(typeof f.avgRating === 'number' && !isNaN(f.avgRating)) ? f.avgRating.toFixed(1) : '–'}
                  </p>
                </div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    // Obsługa kliknięcia każdej karty
    item.querySelectorAll('.card').forEach((card, idx) => {
      card.addEventListener('click', () => showFilmDetail(slideItems[idx].id));
    });

    carouselInner.appendChild(item);
  }



  // Ukryj strzałki, jeśli slajdów jest 1 lub mniej
  const relatedCarousel = document.getElementById('related-carousel');
  const prevArrow = relatedCarousel.querySelector('.carousel-control-prev');
  const nextArrow = relatedCarousel.querySelector('.carousel-control-next');

  const slideCount = carouselInner.querySelectorAll('.carousel-item').length;

  if (slideCount <= 1) {
    prevArrow.style.display = 'none';
    nextArrow.style.display = 'none';
  } else 
  {
    prevArrow.style.display = '';
    nextArrow.style.display = '';
  }

  renderReviews(filmId);

}

// Pobierz recenzje z localStorage
function getReviews(filmId) {
  const allReviews = JSON.parse(localStorage.getItem('reviews') || '{}');
  return allReviews[filmId] || [];
}

// Zapisz recenzje w localStorage
function saveReview(filmId, review) {
  const allReviews = JSON.parse(localStorage.getItem('reviews') || '{}');
  if (!allReviews[filmId]) {
    allReviews[filmId] = [];
  }
  allReviews[filmId].push(review);
  localStorage.setItem('reviews', JSON.stringify(allReviews));
}

function renderReviews(filmId) {
  const list = document.getElementById('reviews-list');
  const summary = document.getElementById('review-summary');
  const reviews = JSON.parse(localStorage.getItem('reviews_' + filmId)) || [];

  list.innerHTML = '';

  if (reviews.length === 0) {
    list.innerHTML = '<li class="list-group-item">Brak opinii.</li>';
    summary.textContent = '';
    return;
  }

  // Średnia
  const avg = (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1);
  summary.textContent = `Liczba opinii: ${reviews.length} | Średnia ocena: ${avg}/10`;

  reviews.forEach(r => {
    const li = document.createElement('li');
    li.className = 'list-group-item';
    li.style.wordWrap = 'break-word';
    li.style.whiteSpace = 'pre-wrap'; // dla zachowania enterów jeśli chcesz
    li.innerHTML = `<strong>${r.user}</strong> (${r.rating}/10): ${r.text}`;

    list.appendChild(li);
  });
}


document.getElementById('review-form').addEventListener('submit', function (e) {
  e.preventDefault();

  const user = document.getElementById('review-user').value.trim();
  const text = document.getElementById('review-text').value.trim();
  const rating = parseInt(document.getElementById('review-rating').value);

  if (!user || !text || isNaN(rating)) return;

  const filmId = currentFilmId;
  const reviews = JSON.parse(localStorage.getItem('reviews_' + filmId)) || [];

  reviews.push({ user, text, rating });
  localStorage.setItem('reviews_' + filmId, JSON.stringify(reviews));

  this.reset();
  reviewText.style.height = 'auto'; // ⬅️ TO DODAJ
  document.getElementById('rating-value').textContent = 5;
  renderReviews(filmId);

});


document.getElementById('review-rating').addEventListener('input', function () {
  document.getElementById('rating-value').textContent = this.value;
});


reviewText.addEventListener('input', function () {
  this.style.height = 'auto'; // resetuj wysokość
  this.style.height = this.scrollHeight + 'px'; 
});

// Dla początkowego rozmiaru, jeśli np. przeglądarka ma autofill:
window.addEventListener('DOMContentLoaded', () => {
  reviewText.style.height = 'auto';
  reviewText.style.height = reviewText.scrollHeight + 'px';
});




// Powrót do listy filmów
backButton.addEventListener('click', () => {
  filmDetailEl.style.display = 'none';
  renderFilmList();
});

loadFilmy();
