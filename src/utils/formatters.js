export const FormatPrice = (price) => {
    console.log('price', price);
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
    }).format(price);
};
