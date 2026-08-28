const RESULT_MASTER = Object.freeze({
  animal: Object.freeze({
    sloth: true,
    squirrel: true,
    cheetah: true,
    ant: true,
    cat: true,
    dolphin: true,
    eagle: true,
    turtle: true
  }),
  japan: Object.freeze({
    sapporo: true,
    sendai: true,
    takasaki: true,
    tsukuba: true,
    "tokyo-tama": true,
    yokohama: true,
    "fujisawa-chigasaki": true,
    toyama: true,
    kanazawa: true,
    matsumoto: true,
    "mishima-numazu": true,
    shizuoka: true,
    nagoya: true,
    kyoto: true,
    osaka: true,
    kobe: true,
    okayama: true,
    hiroshima: true,
    takamatsu: true,
    fukuoka: true,
    kumamoto: true,
    miyazaki: true,
    kagoshima: true,
    naha: true
  }),
  world: Object.freeze({
    "kuala-lumpur": true,
    penang: true,
    bangkok: true,
    "chiang-mai": true,
    phuket: true,
    danang: true,
    "ho-chi-minh": true,
    bali: true,
    taipei: true,
    kaohsiung: true,
    cebu: true,
    singapore: true,
    lisbon: true,
    porto: true,
    valencia: true,
    malaga: true,
    canary: true,
    malta: true,
    split: true,
    tallinn: true,
    tbilisi: true,
    dubai: true,
    mauritius: true,
    "gold-coast": true,
    sydney: true,
    honolulu: true,
    vancouver: true,
    "mexico-city": true,
    london: true,
    auckland: true
  })
});

const DIAGNOSIS_TYPES = Object.freeze(["animal", "japan", "world"]);

function hasResultId(diagnosisType, resultId) {
  return Boolean(
    RESULT_MASTER[diagnosisType] &&
    typeof resultId === "string" &&
    Object.prototype.hasOwnProperty.call(RESULT_MASTER[diagnosisType], resultId)
  );
}

export { RESULT_MASTER, DIAGNOSIS_TYPES, hasResultId };


