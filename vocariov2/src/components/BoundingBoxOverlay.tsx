import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { DetectedBox } from '../types';

interface Props {
  boxes: DetectedBox[];
  imageWidth: number;
  imageHeight: number;
  selectedBox?: DetectedBox | null;
  onSelectBox: (box: DetectedBox) => void;
}

export const BoundingBoxOverlay: React.FC<Props> = ({
  boxes,
  imageWidth,
  imageHeight,
  selectedBox,
  onSelectBox,
}) => {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {boxes.map((box, index) => {
        // Tọa độ box_2d chuẩn hóa [ymin, xmin, ymax, xmax] theo tỷ lệ 0-1000
        const [ymin, xmin, ymax, xmax] = box.box_2d;
        const top = (ymin / 1000) * imageHeight;
        const left = (xmin / 1000) * imageWidth;
        const width = ((xmax - xmin) / 1000) * imageWidth;
        const height = ((ymax - ymin) / 1000) * imageHeight;

        const isSelected = selectedBox?.object_name === box.object_name;

        return (
          <TouchableOpacity
            key={`${box.object_name}-${index}`}
            activeOpacity={0.8}
            onPress={() => onSelectBox(box)}
            style={[
              styles.box,
              {
                top,
                left,
                width,
                height,
                borderColor: isSelected ? '#F59E0B' : 'rgba(255, 255, 255, 0.85)',
                borderWidth: isSelected ? 2 : 1.5,
                backgroundColor: isSelected ? 'rgba(245, 158, 11, 0.15)' : 'transparent',
              },
            ]}
          >
            {/* Tag nhãn vật thể AI */}
            <View
              style={[
                styles.tag,
                { backgroundColor: isSelected ? '#D97706' : '#2D2823' },
              ]}
            >
              <Text style={styles.tagText}>
                {box.object_name} {Math.round(box.confidence * 100)}%
              </Text>
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  box: {
    position: 'absolute',
    borderRadius: 2,
  },
  tag: {
    position: 'absolute',
    top: -20,
    left: 0,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 2,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  tagText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
    fontFamily: 'monospace',
  },
});

