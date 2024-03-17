export default function useFormatOptionIndexListSelected(indexList, optionSets) {
  const newIndexList = indexList.slice(0, optionSets.length);
  if (newIndexList.length < optionSets.length) {
    const diff = optionSets.length - newIndexList.length;
    for (let i = 0; i < diff; i++) {
      newIndexList.push(0);
    }
  }

  optionSets.forEach((optionSet, index) => {
    if (newIndexList[index] >= optionSet.length) {
      newIndexList[index] = 0;
    }
  });

  return newIndexList;
}
