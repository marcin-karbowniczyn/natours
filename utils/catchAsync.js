// Tworzymy tę funkcję, żeby nie zajmowąć się errorami wewnątrz funkcji typu createTour etc. Ta fukncja zwraca inną funkcję, która jest funkcją async i na której możemy użyć catch. Ta funkcja nie jest wywoływana tutaj, tylko wtedy, kiedy zostanie wykonany określony request, dlatego używamy return. Funkcja createTour, to teraz funkcja zwrócona przez catchAsync, ale nie zostaje ona wywołana tutaj.
module.exports = fn => {
  return (req, res, next) => {
    fn(req, res, next).catch(next); // catch(err => next(err)) === catch(next)
  };
};
