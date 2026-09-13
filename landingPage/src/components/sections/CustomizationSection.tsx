import React from "react";
import { motion } from "framer-motion";
import { FiSliders, FiLayers, FiPackage } from "react-icons/fi";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const customizations = [
  {
    icon: FiPackage,
    title: "Kích thước linh hoạt",
    description: "Chọn loại locker phù hợp: nhỏ, trung bình hoặc lớn",
    options: ["Small (30x40cm)", "Medium (40x60cm)", "Large (50x80cm)"],
  },
  {
    icon: FiLayers,
    title: "Cấu hình module",
    description: "Tùy chỉnh số lượng ngăn và bố trí theo không gian",
    options: ["4 ngăn", "6 ngăn", "8 ngăn", "12 ngăn"],
  },
  {
    icon: FiSliders,
    title: "Tính năng bổ sung",
    description: "Thêm các tính năng nâng cao theo nhu cầu",
    options: ["UV Sterilization", "Temperature Control", "Fragrance System"],
  },
];

const CustomizationSection: React.FC = () => {
  return (
    <section className="py-20 px-8 md:px-16 lg:px-24 bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-orange-500 to-pink-600 bg-clip-text text-transparent">
            Tùy chỉnh theo ý bạn
          </h2>
          <p className="text-lg text-gray-600">
            Thiết kế hệ thống locker phù hợp với nhu cầu của bạn
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {customizations.map((item, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <Card className="h-full hover:shadow-2xl transition-all duration-300 border-2 rounded-2xl">
                <CardHeader>
                  <div className="flex flex-col items-center text-center gap-4">
                    <div className="p-4 rounded-full bg-gradient-to-br from-orange-400 to-pink-500 text-white">
                      <item.icon size={32} />
                    </div>
                    <CardTitle className="text-2xl">{item.title}</CardTitle>
                    <CardDescription className="text-base">
                      {item.description}
                    </CardDescription>
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {item.options.map((option, idx) => (
                      <li
                        key={idx}
                        className="flex items-center gap-3 text-gray-700 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
                      >
                        <div className="w-2 h-2 rounded-full bg-gradient-to-r from-orange-500 to-pink-500"></div>
                        {option}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default CustomizationSection;
