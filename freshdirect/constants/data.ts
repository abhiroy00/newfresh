export type Product = {
  id: string;
  name: string;
  price: number;
  unit: string;
  image: string;
  category: string;
  badge?: string;
  badgeColor?: string;
  description: string;
  isOrganic?: boolean;
};

export type Category = {
  id: string;
  name: string;
  emoji: string;
  image: string;
  color: string;
};

export const CATEGORIES: Category[] = [
  { id: 'c1', name: 'Vegetables', emoji: '\u{1F966}', image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBIOZvnhT68T8RN3hSZdfRYPqPN1MWvIJMNeHxBAuj5vXyLRNN6JCeXSS2ce8NB_GvSrLYLByN5I86UnNigpTyEfKPYCQMO_5yVkrITWKt1rfqZHsxZ0o3hzXvafWgH4YKpeakTVMxwskxfU4_gqkhA88kCawZNuq2djQpWspIfSSPlPJCMeNjrD2Mjol4XnuV9TqYoCbGtwdZnuSTi2OeKTKk4rlQLPd9U_FHde7FVkc4fAw-CPl2nnXKblQnppR45bRh3jpb2S5AM', color: '#e8f5e9' },
  { id: 'c2', name: 'Fruits', emoji: '\u{1F34E}', image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDNJhnR306SGUCHOtW_vAhokyZJkEAZbvViuWfVYEdWBmsiqtlD4SdSqgPT93LVlJKoQLHEKGbJhoGwSmyOFqIuCKVrJCCs8Z-I5dftbwD7D1PSZQvySSCJFhqlQy4GYxd1VA5d0S5jzpvT0QbF29_mES0LgPLhR3jlEA1uSIKnFo7hzr53gpbDB0f-GK4dGYU2LvVV3RFZb59ZVrbcbuM8kzscj8eXSDGQ9Sqt6-FevKpz9-9t6pOlGfr2kVUh4Wa4ZvdM5Ln3p_5e', color: '#fff3e0' },
  { id: 'c3', name: 'Dairy', emoji: '\u{1F95B}', image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDSRbKXr9CbM5jwBby0ehLI2kU7TlW6fHdl-4QWQJG1AYNDJmS9mFMYP2lMsQHnGJqfaTHlL8y7aVfNhm2MpEsEkqIkYD4TZAS2RNHS_AeCdKKv-4bR5xVFAb68o4A8yT21XM53sFqXaKxS3nFX7WFiSoIGqS7AW2VBJfBhwn9Mj7EgqNVCHkNM-BJ5_BAtZ5pLXB0SThqJL4zL9gAPcO1H17PcAPnPGQZiO7qEI1JkO_m1XHNhJSdPrTwg_P28bw5D_JXUy6j', color: '#e3f2fd' },
  { id: 'c4', name: 'Bakery', emoji: '\u{1F35E}', image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuA0fypZ9_rBihWvK6CNZzLhXH9RWHhd1lhJB5UNJa8dqS6UjPblqKKYtFB_oUHyWOVSxUV7eTFuEHCuGKHxnjC0bqelZHSvAJe4gX4j1P0Dsk7c4l37mOgH3jHTDR9VY7APNm_o8nVE-eHp9mxHSQujHkAVXxl3aD6kD7O8MJqNeSLWAc3qp33G7XrdlCzEpYv98hh4Ea1CPQF3SYQvuR3Nf4OKfCKCIIjMgmAIlkl6N3JPlTOSumSM5kFr3jXAVNQ7M4yjgr7', color: '#fce4ec' },
  { id: 'c5', name: 'Meat', emoji: '\u{1F356}', image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBCNoTbdrnYDYWmlRaI-9f7sSRBbFmTIRV9sMxZU9Tblb2sCj_h5FHzOfHjkBenSw39hpDhfmpP1GWlRbMMsBXI8r2aGp6YDpj-FJD4kSJLJ0DVJlRZJRXipXaSa8jSalADsrFdMkmsFG66gCVL6E5JoD2TKEP9DXsLFHh2mgWGTsI2YmyJz_Htz2M5NvNXQ', color: '#fbe9e7' },
  { id: 'c6', name: 'Organic', emoji: '\u{1F33F}', image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBIOZvnhT68T8RN3hSZdfRYPqPN1MWvIJMNeHxBAuj5vXyLRNN6JCeXSS2ce8NB_GvSrLYLByN5I86UnNigpTyEfKPYCQMO_5yVkrITWKt1rfqZHsxZ0o3hzXvafWgH4YKpeakTVMxwskxfU4_gqkhA88kCawZNuq2djQpWspIfSSPlPJCMeNjrD2Mjol4XnuV9TqYoCbGtwdZnuSTi2OeKTKk4rlQLPd9U_FHde7FVkc4fAw-CPl2nnXKblQnppR45bRh3jpb2S5AM', color: '#e8f5e9' },
];

export const PRODUCTS: Product[] = [
  {
    id: 'p1',
    name: 'Organic Roma Tomatoes',
    price: 49,
    unit: '500g',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCuMDSXPcM8SVlPpnJAtl_-qC32IhRoeZkvNlIzB_aySkTmGBekTbXU3ZGwP-hEAKhUWgWgB_x78JRJfK_eT6pbpSh2ZaLPJqQlofJs4YA8RCNou3RlAkes8vAVlK8I3mdJwDGIVZmeQyNKJnoFZENiG_-3so_XDCoTklMSOoKTGDWLoI1uNW7muh6CsRtXlzaATeRCaV19HrQebej82n-uV7AsPkWyKkbEGPHFu6Kwksgkd_-JlueyPZlhGvwDc_NisB7mXDs_V0kX',
    category: 'Organic',
    badge: 'ORGANIC',
    badgeColor: '#28c38a',
    description: 'Sun-ripened Roma tomatoes grown without pesticides on certified organic farms. Perfect for sauces, salads, and everyday cooking.',
    isOrganic: true,
  },
  {
    id: 'p2',
    name: 'Fresh Spinach',
    price: 35,
    unit: '250g',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBIOZvnhT68T8RN3hSZdfRYPqPN1MWvIJMNeHxBAuj5vXyLRNN6JCeXSS2ce8NB_GvSrLYLByN5I86UnNigpTyEfKPYCQMO_5yVkrITWKt1rfqZHsxZ0o3hzXvafWgH4YKpeakTVMxwskxfU4_gqkhA88kCawZNuq2djQpWspIfSSPlPJCMeNjrD2Mjol4XnuV9TqYoCbGtwdZnuSTi2OeKTKk4rlQLPd9U_FHde7FVkc4fAw-CPl2nnXKblQnppR45bRh3jpb2S5AM',
    category: 'Vegetables',
    badge: 'FRESH',
    badgeColor: '#005322',
    description: 'Crisp, tender spinach leaves harvested daily. Rich in iron and vitamins. Great for salads, smoothies, and stir-fries.',
    isOrganic: false,
  },
  {
    id: 'p3',
    name: 'Royal Fuji Apples',
    price: 120,
    unit: '1 kg',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDNJhnR306SGUCHOtW_vAhokyZJkEAZbvViuWfVYEdWBmsiqtlD4SdSqgPT93LVlJKoQLHEKGbJhoGwSmyOFqIuCKVrJCCs8Z-I5dftbwD7D1PSZQvySSCJFhqlQy4GYxd1VA5d0S5jzpvT0QbF29_mES0LgPLhR3jlEA1uSIKnFo7hzr53gpbDB0f-GK4dGYU2LvVV3RFZb59ZVrbcbuM8kzscj8eXSDGQ9Sqt6-FevKpz9-9t6pOlGfr2kVUh4Wa4ZvdM5Ln3p_5e',
    category: 'Fruits',
    badge: 'PREMIUM',
    badgeColor: '#fd761a',
    description: 'Handpicked Royal Fuji apples from Himachal Pradesh orchards. Sweet, crunchy, and naturally fresh.',
    isOrganic: false,
  },
  {
    id: 'p4',
    name: 'Full Cream Milk',
    price: 68,
    unit: '1 Liter',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDSRbKXr9CbM5jwBby0ehLI2kU7TlW6fHdl-4QWQJG1AYNDJmS9mFMYP2lMsQHnGJqfaTHlL8y7aVfNhm2MpEsEkqIkYD4TZAS2RNHS_AeCdKKv-4bR5xVFAb68o4A8yT21XM53sFqXaKxS3nFX7WFiSoIGqS7AW2VBJfBhwn9Mj7EgqNVCHkNM-BJ5_BAtZ5pLXB0SThqJL4zL9gAPcO1H17PcAPnPGQZiO7qEI1JkO_m1XHNhJSdPrTwg_P28bw5D_JXUy6j',
    category: 'Dairy',
    description: 'Fresh full cream milk sourced from pasture-raised cows. Pasteurized and packed the same day for maximum freshness.',
    isOrganic: false,
  },
  {
    id: 'p5',
    name: 'Whole Wheat Bread',
    price: 55,
    unit: '400g',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuA0fypZ9_rBihWvK6CNZzLhXH9RWHhd1lhJB5UNJa8dqS6UjPblqKKYtFB_oUHyWOVSxUV7eTFuEHCuGKHxnjC0bqelZHSvAJe4gX4j1P0Dsk7c4l37mOgH3jHTDR9VY7APNm_o8nVE-eHp9mxHSQujHkAVXxl3aD6kD7O8MJqNeSLWAc3qp33G7XrdlCzEpYv98hh4Ea1CPQF3SYQvuR3Nf4OKfCKCIIjMgmAIlkl6N3JPlTOSumSM5kFr3jXAVNQ7M4yjgr7',
    category: 'Bakery',
    badge: 'BAKED TODAY',
    badgeColor: '#9d4300',
    description: 'Freshly baked whole wheat bread made with 100% whole grain flour. No preservatives, no artificial flavours.',
    isOrganic: false,
  },
  {
    id: 'p6',
    name: 'Baby Carrots',
    price: 42,
    unit: '300g',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBIOZvnhT68T8RN3hSZdfRYPqPN1MWvIJMNeHxBAuj5vXyLRNN6JCeXSS2ce8NB_GvSrLYLByN5I86UnNigpTyEfKPYCQMO_5yVkrITWKt1rfqZHsxZ0o3hzXvafWgH4YKpeakTVMxwskxfU4_gqkhA88kCawZNuq2djQpWspIfSSPlPJCMeNjrD2Mjol4XnuV9TqYoCbGtwdZnuSTi2OeKTKk4rlQLPd9U_FHde7FVkc4fAw-CPl2nnXKblQnppR45bRh3jpb2S5AM',
    category: 'Vegetables',
    description: 'Bite-size baby carrots, washed and ready to eat. High in beta-carotene. Great as a snack or in soups.',
    isOrganic: false,
  },
];

export const DEAL_BANNER = {
  title: 'Farm to Door',
  subtitle: 'In 30 Minutes',
  offer: 'Free delivery on orders above \u20b9499',
  image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCOsOa1sA0QBK8AsauZfm3_CqRjV8x2EuY_cNqCatDWZZ-pMbWFtjlhLRqTTpW2kM8QJ1b_ClfRTPNv0b-vVHGDaTSb8k-hRv6bFyaZRgKMDpCdyNbLU7E5xBnbilDJb5ZLFp8vWXlB83eKPMQcRQcGD65rSRa2TDjqMiU7VQ5kPh_Lv1dBpDuaJMzFgPyL_iYqpQB6A',
};
