const CATEGORY_IMAGE_COLLECTIONS = {
  'Tech': [
    'https://images.unsplash.com/photo-1518770660439-4636190af475?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1200&auto=format&fit=crop&q=80',
  ],
  'Poetry': [
    'https://images.unsplash.com/photo-1499209974431-9dddcece7f88?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1518495973542-4542c06a5843?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1470240731273-7821a6eeb6bd?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?w=1200&auto=format&fit=crop&q=80',
  ],
  'Shayari': [
    'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1495616811223-4d98c6e9c869?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1509114397022-ed747cca3f65?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1508739773434-c26b3d09e071?w=1200&auto=format&fit=crop&q=80',
  ],
  'Short Stories': [
    'https://images.unsplash.com/photo-1476820865390-c52aeebb9891?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1513836279014-a89f7a76ae86?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1448375240586-882707db888b?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1501504905252-473c47e087f8?w=1200&auto=format&fit=crop&q=80',
  ],
  'Essays': [
    'https://images.unsplash.com/photo-1457369804613-52c61a468e7d?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1455390582262-044cdead277a?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1488190211105-8b0e65b80b4e?w=1200&auto=format&fit=crop&q=80',
  ],
  'Philosophy': [
    'https://images.unsplash.com/photo-1461360370896-922624d12aa1?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1505664194779-8beaceb93744?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1447069387593-a5de0862481e?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1507842229440-2182098b6716?w=1200&auto=format&fit=crop&q=80',
  ],
  'Humour': [
    'https://images.unsplash.com/photo-1531747056595-07f6cbbe10ad?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1527224857830-43a7acc85260?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1514306191717-452ec28c7814?w=1200&auto=format&fit=crop&q=80',
  ],
  'Reviews': [
    'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=1200&auto=format&fit=crop&q=80',
  ],
  'Culture': [
    'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1513694203232-719a280e022f?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1473177104440-ffee2f376098?w=1200&auto=format&fit=crop&q=80',
  ]
};

export function getCoverImageForCategory(category) {
  const images = CATEGORY_IMAGE_COLLECTIONS[category] || CATEGORY_IMAGE_COLLECTIONS['Essays'];
  const randomIndex = Math.floor(Math.random() * images.length);
  return images[randomIndex];
}
