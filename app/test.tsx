import { useHabitats } from "@/context/HabitatContext";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  Button,
  Circle,
  Input,
  ScrollView,
  Separator,
  SizableText,
  Text,
  XStack,
  YStack,
} from "tamagui";

type CellState = {
  isOn: boolean;
  number: number | null;
};

export function GridSizeInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (newValue: number) => void;
}) {
  const [text, setText] = useState(value.toString());
  const inputRef = useRef<any>(null);

  // Keep the displayed text in sync with parent's value
  useEffect(() => {
    setText(value.toString());
  }, [value]);

  const handleChangeText = (input: string) => {
    setText(input);

    // Remove anything that's not a digit
    const cleaned = input.replace(/[^0-9]/g, "");

    // Convert to number, default to 1 if empty
    let num = cleaned === "" ? 1 : Number(cleaned);

    // Clamp to 1–10
    if (num < 1) num = 1;
    if (num > 9) num = 9;

    // Tell parent the new (cleaned/clamped) value
    onChange(num);
  };
  return (
    <Input
      value={text}
      onChangeText={handleChangeText}
      keyboardType="numeric"
      selectTextOnFocus={true}
      returnKeyType="done"
      placeholder={label}
      maxLength={1}
      textAlign="center"
      theme="black"
    />
  );
}

export default function Test() {
  const router = useRouter();
  const { habitats, addHabitat } = useHabitats();

  //form states
  const [habitatName, setHabitatName] = useState("");
  const [connectionAddress, setConnectionAddress] = useState("");

  //handle save
  const handleSave = () => {
    addHabitat(habitatName, connectionAddress);
    router.push("/habitat_selection");
  };

  //is form valid only if both habitat name and connection address are not empty & forms are unique
  const ifFormValid =
    habitatName.trim() !== "" &&
    connectionAddress.trim() !== "" &&
    !habitats.some(
      (h) =>
        h.name.toLowerCase() === habitatName.trim().toLowerCase() ||
        h.connection.toLowerCase() === connectionAddress.trim().toLowerCase(),
    );

  //row col usestates
  const [rows, setRow] = useState(1);
  const [cols, setCol] = useState(1);

  //grid state
  const [grid, setGrid] = useState<CellState[][]>(
    Array(rows)
      .fill("")
      .map(() =>
        Array(cols)
          .fill("")
          .map(() => ({ isOn: false, number: null })),
      ),
  );

  //next number to assign (1,2..)
  const [nextNumber, setNextNumber] = useState(1);

  //reset grid after size update
  useEffect(() => {
    const newGrid = Array(rows)
      .fill(null)
      .map(() =>
        Array(cols)
          .fill(null)
          .map(() => ({ isOn: false, number: null })),
      );
    setGrid(newGrid);
    setNextNumber(1); // reset numbering when size changes
  }, [rows, cols]);

  const toggleCell = (r: number, c: number) => {
    setGrid((prevGrid) => {
      const newGrid = prevGrid.map((row) => row.slice()); // deep copy
      const cell = newGrid[r][c];

      if (cell.isOn) {
        //return prev grid
        return prevGrid;
      } else {
        // turn on and assign next number
        newGrid[r][c] = { isOn: true, number: nextNumber };
        setNextNumber((prev) => prev + 1);
      }

      return newGrid;
    });
  };
  return (
    <YStack
      flex={1}
      backgroundColor="$gray12"
      items={"center"}
      padding="$4"
      paddingTop={60}
      gap="$4"
      width={"100%"}
    >
      <YStack
        flex={1}
        backgroundColor="$gray12"
        borderWidth={3}
        borderColor={"white"}
        items={"flex-start"}
        width="100%"
        gap="$4"
        padding="$5"
        paddingTop={30}
        rounded={40}
      >
        {/*title ystack*/}
        <YStack width="100%" gap="$4">
          <SizableText color="white" size="$8" alignSelf={"center"}>
            {"Add Existing Habitat"}
          </SizableText>
          <Separator
            borderColor="gray"
            borderBottomWidth={3}
            alignSelf="stretch"
          />
        </YStack>

        {/*all the scrollable stuff*/}
        <YStack width="100%" gap="$4">
          <SizableText size="$3" color="white">
            {"Habitat Name"}
          </SizableText>
          <Input
            theme="black"
            width={"100%"}
            size="$2"
            placeholder="Enter Habitat Name"
            value={habitatName}
            onChangeText={setHabitatName}
          />
          <SizableText size="$3" color="white">
            {"Connection Address"}
          </SizableText>
          <Input
            theme="black"
            width={"100%"}
            size="$2"
            placeholder="Enter Connection Address"
            value={connectionAddress}
            onChangeText={setConnectionAddress}
          />
          <XStack gap="$2" justify="flex-end" theme="light_gray_accent">
            <Button size="$3" onPress={() => router.back()}>
              Back
            </Button>
            <Button
              size="$3"
              theme="dark_green"
              disabled={!ifFormValid}
              disabledStyle={{ opacity: 0.5 }}
              onPress={handleSave}
            >
              Save
            </Button>
          </XStack>
          <XStack
            borderWidth={2}
            borderColor={"gray"}
            rounded={20}
            padding="$2"
            width="100%"
            gap="$2"
            items={"center"}
            justify={"center"}
          >
            <Text fontSize="$6" color="white">
              {"Grid Size"}
            </Text>
            <GridSizeInput value={rows} onChange={setRow} label={"x"} />
            <GridSizeInput value={cols} onChange={setCol} label={"y"} />
            <Separator
              vertical
              borderColor="$gray8"
              borderWidth={1}
              height="100%" // or fixed value like 40
              marginHorizontal="$1" // space on left/right
            />
            <Button
              size="$3"
              theme="dark_red"
              onPress={() => {
                setGrid(
                  grid.map((row) =>
                    row.map(() => ({ isOn: false, number: null })),
                  ),
                );
                setNextNumber(1);
              }}
            >
              Clear
            </Button>
          </XStack>
          {/* The resizable grid */}
          <ScrollView
            horizontal
            bounces={false}
            alwaysBounceHorizontal={false}
            overScrollMode="never"
            showsHorizontalScrollIndicator={false}
            nestedScrollEnabled={true}
            contentContainerStyle={{
              flexGrow: 1,
              //alignItems: "center",
              paddingHorizontal: 0, // ← no padding here
            }}
            style={{ width: "100%" }}
          >
            <YStack gap="$2" alignItems="center">
              <Text fontSize="$6" color="white" alignSelf="center">
                {"Home"}
              </Text>
              {grid.map((row, rowIndex) => (
                <XStack key={rowIndex} gap="$2">
                  {row.map((cell, colIndex) => (
                    <Button
                      key={colIndex}
                      width={50}
                      height={50}
                      borderWidth={1.5}
                      borderColor={cell.isOn ? "$blue9" : "$gray8"}
                      backgroundColor={
                        cell.isOn ? "transparent" : "transparent"
                      }
                      borderRadius="$4"
                      onPress={() => toggleCell(rowIndex, colIndex)}
                      pressStyle={{ scale: 0.95 }}
                      animation="quick"
                    >
                      {cell.isOn ? (
                        <Text
                          fontSize={"$5"}
                          color="white"
                          lineHeight={50}
                          width={"100%"}
                        >
                          {cell.number}
                        </Text>
                      ) : (
                        <Circle size={12} backgroundColor="$gray6" />
                      )}
                    </Button>
                  ))}
                </XStack>
              ))}
            </YStack>
          </ScrollView>
          <XStack
            borderWidth={2}
            borderColor={"gray"}
            width="100%"
            items="center"
            justify="space-between"
            rounded={20}
            padding="$3"
            gap="$2"
          >
            <Text fontSize={"$5"} color="white">
              Sensors: {nextNumber - 1}
            </Text>
            <Button
              size="$3"
              theme="dark_green"
              disabled={nextNumber - 1 < 1}
              opacity={nextNumber - 1 >= 1 ? 1 : 0.3}
            >
              Save
            </Button>
          </XStack>
        </YStack>
      </YStack>
    </YStack>
  );
}
