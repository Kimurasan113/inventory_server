const Item = require("../models/itemModel");
function incrementLetterPrefix(prefix) {
  if (!prefix) return 'A';

  if (prefix === 'Z') {
    return 'AA';
  }

  const lastChar = prefix.slice(-1);
  const restOfPrefix = prefix.slice(0, -1);

  if (lastChar === 'Z') {
    return incrementLetterPrefix(restOfPrefix) + 'A';
  }

  const nextChar = String.fromCharCode(lastChar.charCodeAt(0) + 1);
  return restOfPrefix + nextChar;
}

const createItem = async (data) => {
  try {
    // နောက်ဆုံး item ရှာမယ်
    const lastItem = await Item.findOne().sort({ createdAt: -1 });

    let nextPrefix = 'A';
    let nextNumber = 1;

    if (lastItem && lastItem.code) {
      const lastId = lastItem.code;

      // null check added
      const prefixMatch = lastId.match(/[A-Z]+/);
      const numberMatch = lastId.match(/\d+/);

      if (prefixMatch && numberMatch) {
        const lastPrefix = prefixMatch[0];   // eg. "A"
        const lastNumber = parseInt(numberMatch[0], 10); // eg. 12

        if (lastNumber >= 9999) { // 4 digit
          nextPrefix = incrementLetterPrefix(lastPrefix);
          nextNumber = 1;
        } else {
          nextPrefix = lastPrefix;
          nextNumber = lastNumber + 1;
        }
      }
    }

    // 0001 → 9999 format
    const formattedNumber = String(nextNumber).padStart(4, '0');
    data.code = `${nextPrefix}${formattedNumber}`;

    const newItem = new Item({ ...data, code: data.code });
    const savedItem = await newItem.save();

    return savedItem;
  } catch (error) {
    throw new Error('Error creating item: ' + error.message);
  }
};
const getAllItems = async () => {
  return await Item.find().sort({ createdAt: -1 });
};

const getItemById = async (id) => {
  return await Item.findById(id);
};

const updateItem = async (id, data) => {
  return await Item.findByIdAndUpdate(id, data, { new: true });
};

const deleteItem = async (id) => {
  return await Item.findByIdAndDelete(id);
};

module.exports = {
  createItem,
  getAllItems,
  getItemById,
  updateItem,
  deleteItem,
};
