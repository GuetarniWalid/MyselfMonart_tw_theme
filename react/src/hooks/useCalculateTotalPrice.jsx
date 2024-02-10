export default function useCalculateTotalPrice(optionSets, optionIndexListSelected) {
    const totalPrice = optionIndexListSelected.reduce((totalPrice, indexOptionSelected, index) => {
        const optionSelected = optionSets[index][indexOptionSelected];
        return totalPrice + optionSelected.price;
    }, 0);
    
    return totalPrice;
}
 