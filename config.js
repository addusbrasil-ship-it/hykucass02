// Valores em centavos. "payouts" = retorno total multiplicado pela aposta (inclui a aposta devolvida).
module.exports = { games: {
  roulette:  { name: 'Roleta', minBet: 50,  maxBet: 100000, rtp: 'Cor 87,1% · Número 86,5% · Verde 13,5%',
               payouts: { color: 1.79, number: 32, green: 5 } },
  bacbo:     { name: 'Bac Bo', minBet: 200, maxBet: 100000, rtp: '≈ 87%',
               payouts: { player: 1.71, banker: 1.71, tie: 7.7 } },
  baccarat9: { name: 'Baccarat Sempre 9', minBet: 400, maxBet: 100000, rtp: '≈ 87%',
               payouts: { player: 1.92, banker: 1.55, tie: 9.5 } },
  baccarat:  { name: 'Baccarat Comum', minBet: 500, maxBet: 100000, rtp: '≈ 87%',
               payouts: { player: 1.74, banker: 1.69, tie: 9.1 } }
} };
