export default function useCalculateTotalPrice(optionSets, optionIndecesSelected) {
    const totalPrice = optionIndecesSelected.reduce((totalPrice, indexOptionSelected, index) => {
        const optionSelected = optionSets[index][indexOptionSelected];
        return totalPrice + optionSelected.price;
    }, 0);
    
    return totalPrice.toFixed(2);
}
 