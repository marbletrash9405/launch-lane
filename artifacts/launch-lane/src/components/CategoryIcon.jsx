import { BinIcon, LeafIcon, HeartIcon, PawIcon, BoxIcon, MonitorIcon, BookIcon, SparkIcon } from "./Icons";

const map = {
  "Bin cleaning": BinIcon,
  "Lawn care": LeafIcon,
  "Babysitting": HeartIcon,
  "Pet care": PawIcon,
  "Digital support": MonitorIcon,
  "Hauling": BoxIcon,
  "Tutoring": BookIcon,
  "Others": SparkIcon,
};

export default function CategoryIcon({ name }) {
  const Icon = map[name] || SparkIcon;
  return <Icon />;
}
