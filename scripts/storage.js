(function () {
  const LUGGAGE_KEY = "my_luggage";

  function readLuggage() {
    try {
      const luggage = JSON.parse(localStorage.getItem(LUGGAGE_KEY) || "[]");
      return Array.isArray(luggage) ? luggage : [];
    } catch (error) {
      return [];
    }
  }

  function writeLuggage(luggage) {
    localStorage.setItem(LUGGAGE_KEY, JSON.stringify(Array.isArray(luggage) ? luggage : []));
  }

  window.AppStorage = {
    readLuggage,
    writeLuggage
  };
})();
