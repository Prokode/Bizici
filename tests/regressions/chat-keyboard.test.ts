import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const screens = [
  "nearbuy/app/chat/[id].tsx",
  "nearbuy-business/app/(home)/shops/[shopId]/chat/[conversationId].tsx",
];

for (const screen of screens) {
  test(`${screen} keeps the composer above the keyboard on both native platforms`, () => {
    const source = readFileSync(
      new URL(`../../artifacts/${screen}`, import.meta.url),
      "utf8",
    );
    assert.match(source, /import \{ KeyboardAvoidingView \} from "react-native-keyboard-controller"/);
    assert.match(source, /<KeyboardAvoidingView[\s\S]*?behavior="padding"/);
    assert.match(source, /keyboardVerticalOffset=\{0\}/);
    assert.doesNotMatch(source, /behavior=\{Platform\.OS === "ios"/);
    assert.equal((source.match(/<KeyboardAvoidingView\b/g) ?? []).length, 1);
    assert.match(source, /<FlatList[\s\S]*?keyboardDismissMode="interactive"/);
    assert.match(source, /<FlatList[\s\S]*?keyboardShouldPersistTaps="handled"/);
    const keyboardContent = source.split("<KeyboardAvoidingView")[1]?.split("</KeyboardAvoidingView>")[0];
    assert.match(keyboardContent ?? "", /<TextInput/);
    assert.match(keyboardContent ?? "", /onPress=\{onSend\}/);
    assert.match(keyboardContent ?? "", /paddingBottom: Math\.max\(insets\.bottom, 8\)/);
  });
}
