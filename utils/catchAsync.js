module.exports = fn => {
  // Hier catchen wir den Error aus den tourController und authController Funktionen und weitere!!!!
  // Es wird eine anonyme Funktion returnt, die im Controller definiert ist
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
};
