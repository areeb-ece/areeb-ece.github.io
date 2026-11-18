---
title: In progress and planned
description: What I'm building now and what's next, from redstone CPUs and SystemVerilog to audio DSP and power electronics.
order: 90
bannerAlt: A dark circuit board with gold traces running between unmarked chips
---

Projects I'm working on now or have lined up, each with what I need to learn first.
Within each area they're roughly in the order I plan to do them.

## Redstone CPU

### Clocked redstone adder and ALU *(in progress)*

- Sequential logic: latches, flip-flops and registers
- Clock design and repeater timing in redstone
- Control logic: counters and an instruction ROM

### Machine learning on a Minecraft CPU

- The clocked redstone ALU above
- Basic ML: linear models and gradient descent
- Fixed-point arithmetic

## Digital design and verification

### 16-bit adder/subtractor and 8-bit ALU in SystemVerilog

- SystemVerilog
- Self-checking testbenches

### UART transmitter and receiver

- SystemVerilog
- Python and cocotb
- The UART protocol
- A simulator: Icarus Verilog or Verilator
- GitHub Actions

### FIFO with assertions and a formal check

- SystemVerilog Assertions
- Formal verification basics
- Yosys and SymbiYosys

### RV32I RISC-V CPU

- The RISC-V RV32I spec
- Computer architecture: datapath, control and pipelining
- RISC-V assembly
- The GNU RISC-V toolchain and Spike

### A small UVM testbench

- Object-oriented SystemVerilog: classes, randomisation and constraints
- UVM: agents, drivers, monitors and scoreboards
- EDA Playground

## FPGA and silicon

### FPGA board progression: LED, UART, VGA, soft CPU

- An FPGA board and its toolchain, or Yosys and nextpnr
- Constraint files and timing closure
- UART and VGA timing
- A logic analyser

### A Tiny Tapeout design

- Synthesis and timing basics
- The Tiny Tapeout template and its GitHub Actions flow
- Designing to a one-tile area budget

## Audio

### Modular audio effects board

- Signals and systems
- The Altium PCB design course
- Analog filters and op-amp circuits

### FIR filter in fixed-point Verilog

- Convolution and frequency response
- Fixed-point arithmetic
- NumPy and SciPy filter design

### Effects modules in RTL: biquad EQ, compressor and clipper

- The FIR filter above
- IIR filters and their stability in fixed point
- The z-transform

### I2S transmitter and receiver

- The I2S spec
- SystemVerilog Assertions

## Power electronics and the grid

### 48 V to 12 V synchronous buck converter

- Switching converters, MOSFETs, inductor and capacitor selection
- LTspice
- The Altium PCB design course
- PCB layout for switching noise and heat

### ESP32 home energy monitor

- AC power: $P$, $Q$, $S$ and power factor
- Safe current-transformer and voltage sensing
- ESP32 ADC sampling
- Basic classification

### Inverse-time overcurrent protection relay in Verilog

- Power-system protection and the IEC 60255 curves
- Fixed-point maths in RTL
- A Python model to check against

### Power flow and N-1 contingency analysis on the IEEE 14-bus system

- Power-flow analysis: bus types and Newton-Raphson
- Per-unit systems
- Python with pandapower or PyPSA

### Day-ahead Ontario demand forecaster

- pandas
- Time-series forecasting
- Regression and gradient-boosting models
- IESO and weather data

## Embedded

### ESP32 or Arduino sensor project with an IMU or camera

- C or C++ on a microcontroller
- I2C and SPI
- Filtering noisy sensor data

### My own C drivers on a Pi Pico or STM32

- C
- Reading datasheets and reference manuals
- Memory-mapped registers and interrupts
